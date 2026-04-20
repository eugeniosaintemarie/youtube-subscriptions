import { google } from "googleapis";
import { getValidAccessToken } from "@/lib/auth";
import type { AppVideo } from "@/lib/types";

const CACHE_SECONDS = 15 * 60;
const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;

const durationToSeconds = (duration: string): number => {
  const match = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(duration);
  if (!match) {
    return 0;
  }

  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const seconds = Number(match[3] ?? 0);
  return hours * 3600 + minutes * 60 + seconds;
};

const chunk = <T>(items: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
};

export const videosCacheTtlSeconds = CACHE_SECONDS;

export async function getYouTubeClient() {
  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    return null;
  }

  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  return google.youtube({ version: "v3", auth });
}

export async function fetchRecentSubscriptionVideos(): Promise<AppVideo[]> {
  const youtube = await getYouTubeClient();
  if (!youtube) {
    throw new Error("AUTH_REQUIRED");
  }

  const subscriptions = [] as string[];
  let nextPageToken: string | undefined;

  do {
    const response = await youtube.subscriptions.list({
      part: ["snippet"],
      mine: true,
      maxResults: 50,
      pageToken: nextPageToken
    });

    for (const item of response.data.items ?? []) {
      const channelId = item.snippet?.resourceId?.channelId;
      if (channelId) {
        subscriptions.push(channelId);
      }
    }

    nextPageToken = response.data.nextPageToken ?? undefined;
  } while (nextPageToken);

  if (subscriptions.length === 0) {
    return [];
  }

  const channelChunks = chunk(subscriptions, 50);
  const channelsResponses = await Promise.all(
    channelChunks.map((ids) =>
      youtube.channels.list({
        part: ["contentDetails"],
        id: ids
      })
    )
  );

  const uploadsPlaylistIds: string[] = [];
  for (const res of channelsResponses) {
    for (const channel of res.data.items ?? []) {
      const uploads = channel.contentDetails?.relatedPlaylists?.uploads;
      if (uploads) {
        uploadsPlaylistIds.push(uploads);
      }
    }
  }

  const oneMonthAgo = Date.now() - ONE_MONTH_MS;
  const candidateVideos = new Map<string, AppVideo>();

  const playlistBatches = chunk(uploadsPlaylistIds, 20);
  await Promise.all(
    playlistBatches.map(async (playlistBatch) => {
      const responses = await Promise.all(
        playlistBatch.map((playlistId) =>
          youtube.playlistItems.list({
            part: ["snippet", "contentDetails"],
            playlistId,
            maxResults: 5
          })
        )
      );

      for (const response of responses) {
        for (const item of response.data.items ?? []) {
          const publishedAtRaw = item.snippet?.publishedAt;
          const videoId = item.contentDetails?.videoId;

          if (!publishedAtRaw || !videoId) {
            continue;
          }

          const publishedAtMs = new Date(publishedAtRaw).getTime();
          if (Number.isNaN(publishedAtMs) || publishedAtMs < oneMonthAgo) {
            continue;
          }

          const thumbnails = item.snippet?.thumbnails;
          const thumbnail = thumbnails?.medium?.url ?? thumbnails?.default?.url;
          if (!thumbnail) {
            continue;
          }

          candidateVideos.set(videoId, {
            id: videoId,
            title: item.snippet?.title ?? "Untitled",
            thumbnail,
            publishedAt: new Date(publishedAtMs).toISOString(),
            channelTitle: item.snippet?.channelTitle ?? "Unknown"
          });
        }
      }
    })
  );

  const candidateIds = Array.from(candidateVideos.keys());
  if (candidateIds.length === 0) {
    return [];
  }

  const detailChunks = chunk(candidateIds, 50);
  const detailResponses = await Promise.all(
    detailChunks.map((ids) =>
      youtube.videos.list({
        part: ["contentDetails"],
        id: ids
      })
    )
  );

  const allowedIds = new Set<string>();
  for (const response of detailResponses) {
    for (const item of response.data.items ?? []) {
      const duration = item.contentDetails?.duration;
      if (!duration) {
        continue;
      }

      if (durationToSeconds(duration) > 180 && item.id) {
        allowedIds.add(item.id);
      }
    }
  }

  const finalVideos = Array.from(candidateVideos.values())
    .filter((video) => allowedIds.has(video.id))
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));

  return finalVideos;
}

export async function addVideoToWatchLater(videoId: string): Promise<void> {
  const youtube = await getYouTubeClient();
  if (!youtube) {
    throw new Error("AUTH_REQUIRED");
  }

  const targetTitle = "0 Watch";
  let playlistId: string | null = null;
  let nextPageToken: string | undefined;

  do {
    const response = await youtube.playlists.list({
      part: ["snippet"],
      mine: true,
      maxResults: 50,
      pageToken: nextPageToken
    });

    for (const item of response.data.items ?? []) {
      if (item.snippet?.title === targetTitle && item.id) {
        playlistId = item.id;
        break;
      }
    }

    if (playlistId) {
      break;
    }

    nextPageToken = response.data.nextPageToken ?? undefined;
  } while (nextPageToken);

  if (!playlistId) {
    const created = await youtube.playlists.insert({
      part: ["snippet", "status"],
      requestBody: {
        snippet: {
          title: targetTitle,
          description: "Playlist videovisor Vercel"
        },
        status: {
          privacyStatus: "private"
        }
      }
    });

    playlistId = created.data.id ?? null;
  }

  if (!playlistId) {
    throw new Error("Failed to resolve target playlist");
  }

  await youtube.playlistItems.insert({
    part: ["snippet"],
    requestBody: {
      snippet: {
        playlistId,
        resourceId: {
          kind: "youtube#video",
          videoId
        }
      }
    }
  });
}
