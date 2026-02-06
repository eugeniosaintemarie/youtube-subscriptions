import os
import datetime
import isodate
from flask import Flask, render_template, redirect, url_for, session, request, flash, jsonify
from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from google.auth.transport.requests import Request

app = Flask(__name__)
app.secret_key = os.urandom(24)

os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'

CLIENT_SECRETS_FILE = 'client_secrets.json'
SCOPES = ['https://www.googleapis.com/auth/youtube.force-ssl']
API_SERVICE_NAME = 'youtube'
API_VERSION = 'v3'

VIDEO_CACHE = {
    'data': None,
    'timestamp': None
}
CACHE_DURATION = datetime.timedelta(minutes=15)

def get_favorite_channels():
    favs = []
    if os.path.exists('favs.md'):
        with open('favs.md', 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line:
                    favs.append(line)
    return favs

def get_authenticated_service():
    creds = None
    if 'credentials' in session:
        creds = Credentials(**session['credentials'])
    
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            return None
    
    return build(API_SERVICE_NAME, API_VERSION, credentials=creds)

@app.route('/')
def index():
    if 'credentials' not in session:
        return redirect(url_for('login'))
    
    force_refresh = request.args.get('refresh') == 'true'
    
    now = datetime.datetime.now(datetime.timezone.utc)
    if not force_refresh and VIDEO_CACHE['data'] is not None and VIDEO_CACHE['timestamp']:
        if now - VIDEO_CACHE['timestamp'] < CACHE_DURATION:
            favs = get_favorite_channels()
            return render_template('index.html', videos=VIDEO_CACHE['data'], last_updated=VIDEO_CACHE['timestamp'], favs=favs)

    youtube = get_authenticated_service()
    if not youtube:
        return redirect(url_for('login'))

    try:
        subscriptions = []
        sub_request = youtube.subscriptions().list(
            part="snippet,contentDetails",
            mine=True,
            maxResults=50
        )
        while sub_request:
            response = sub_request.execute()
            for item in response.get('items', []):
                subscriptions.append(item)
            sub_request = youtube.subscriptions().list_next(sub_request, response)

        channel_ids = [sub['snippet']['resourceId']['channelId'] for sub in subscriptions]
        if not channel_ids:
             return render_template('index.html', videos=[])

        upload_playlists = {}
        for i in range(0, len(channel_ids), 50):
            chunk = channel_ids[i:i+50]
            ch_response = youtube.channels().list(
                part="contentDetails",
                id=",".join(chunk)
            ).execute()
            for ch in ch_response.get('items', []):
                pid = ch['contentDetails']['relatedPlaylists']['uploads']
                upload_playlists[ch['id']] = pid

        all_videos = []
        current_time = datetime.datetime.now(datetime.timezone.utc)
        one_month_ago = current_time - datetime.timedelta(days=30)
        
        def list_playlist_items_callback(request_id, response, exception):
            if exception:
                return
            
            for item in response.get('items', []):
                published_at_str = item['snippet']['publishedAt']
                published_at = isodate.parse_datetime(published_at_str)
                
                if published_at > one_month_ago:
                    vid_id = item['contentDetails']['videoId']
                    all_videos.append({
                        'id': vid_id,
                        'title': item['snippet']['title'],
                        'thumbnail': item['snippet']['thumbnails'].get('medium', item['snippet']['thumbnails'].get('default'))['url'],
                        'publishedAt': published_at,
                        'channelTitle': item['snippet']['channelTitle']
                    })

        playlist_ids = list(upload_playlists.values())
        for i in range(0, len(playlist_ids), 50):
            batch = youtube.new_batch_http_request(callback=list_playlist_items_callback)
            chunk = playlist_ids[i:i+50]
            
            for pid in chunk:
                batch.add(youtube.playlistItems().list(
                    part="snippet,contentDetails",
                    playlistId=pid,
                    maxResults=5
                ), request_id=pid)
            
            batch.execute()

        video_ids = [v['id'] for v in all_videos]
        final_videos = []
        
        if video_ids:
            for i in range(0, len(video_ids), 50):
                chunk = video_ids[i:i+50]
                vid_response = youtube.videos().list(
                    part="contentDetails,snippet",
                    id=",".join(chunk)
                ).execute()
                
                for vid in vid_response.get('items', []):
                    content_details = vid.get('contentDetails', {})
                    duration_str = content_details.get('duration')
                    
                    if not duration_str:
                        continue

                    duration = isodate.parse_duration(duration_str)
                    
                    if duration.total_seconds() > 180:
                        orig = next((v for v in all_videos if v['id'] == vid['id']), None)
                        if orig:
                            final_videos.append(orig)

        final_videos.sort(key=lambda x: x['publishedAt'], reverse=True)

        VIDEO_CACHE['data'] = final_videos
        VIDEO_CACHE['timestamp'] = now
        
        favs = get_favorite_channels()
        return render_template('index.html', videos=final_videos, last_updated=now, favs=favs)

    except Exception as e:
        return f"An error occurred: {e}"

@app.route('/login')
def login():
    if not os.path.exists(CLIENT_SECRETS_FILE):
        return "Falta el archivo 'client_secrets.json'. Por favor configuralo en la consola de Google Cloud."

    flow = Flow.from_client_secrets_file(
        CLIENT_SECRETS_FILE, scopes=SCOPES)
    flow.redirect_uri = url_for('oauth2callback', _external=True)
    
    authorization_url, state = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true')
    
    session['state'] = state
    return redirect(authorization_url)

@app.route('/oauth2callback')
def oauth2callback():
    state = session['state']
    flow = Flow.from_client_secrets_file(
        CLIENT_SECRETS_FILE, scopes=SCOPES, state=state)
    flow.redirect_uri = url_for('oauth2callback', _external=True)
    
    authorization_response = request.url
    flow.fetch_token(authorization_response=authorization_response)
    
    credentials = flow.credentials
    session['credentials'] = {
        'token': credentials.token,
        'refresh_token': credentials.refresh_token,
        'token_uri': credentials.token_uri,
        'client_id': credentials.client_id,
        'client_secret': credentials.client_secret,
        'scopes': credentials.scopes
    }
    
    return redirect(url_for('index'))

@app.route('/watch-later/<video_id>', methods=['POST'])
def add_to_watch_later(video_id):
    youtube = get_authenticated_service()
    if not youtube:
        return jsonify({'success': False, 'message': 'Auth required'}), 401
        
    try:
        target_title = "0 Watch"
        playlist_id = None
        
        req = youtube.playlists().list(
            part="snippet",
            mine=True,
            maxResults=50
        )
        while req:
            res = req.execute()
            for item in res.get('items', []):
                if item['snippet']['title'] == target_title:
                    playlist_id = item['id']
                    break
            if playlist_id:
                break
            req = youtube.playlists().list_next(req, res)
            
        if not playlist_id:
            res = youtube.playlists().insert(
                part="snippet,status",
                body={
                    "snippet": {
                        "title": target_title,
                        "description": "Playlist videovisor local"
                    },
                    "status": {
                        "privacyStatus": "private"
                    }
                }
            ).execute()
            playlist_id = res['id']

        youtube.playlistItems().insert(
            part="snippet",
            body={
                "snippet": {
                    "playlistId": playlist_id,
                    "resourceId": {
                        "kind": "youtube#video",
                        "videoId": video_id
                    }
                }
            }
        ).execute()
        return jsonify({'success': True, 'message': 'Saved'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='localhost', port=5000)
