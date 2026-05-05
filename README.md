# YouTube Subscriptions Viewer

A personal web app for browsing recent uploads from your YouTube subscriptions, filtering favorite channels, and saving videos to your private Watch Later playlist.

## English

### What it does

- Shows recent uploads from the channels you are subscribed to.
- Filters videos by favorite channels or hides them entirely.
- Marks watched videos locally and can dim seen cards in the feed.
- Saves videos to a private playlist named `0 Watch` with a long-press gesture or a one-tap button.
- Uses cached data when available so the UI can still render during auth or network issues.

### Stack

- Next.js 15 with the App Router and Route Handlers
- Google OAuth 2.0 and the YouTube Data API v3
- Vercel KV for OAuth tokens, favorites, and video cache
- Client-side localStorage for UI preferences, seen items, and fallback cache

### Environment variables

Copy `.env.example` to `.env.local` and fill in the values below:

```bash
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/api/oauth/callback
APP_BASE_URL=http://localhost:3000
PRIVATE_ACCESS_USER=
PRIVATE_ACCESS_PASS=
FAVORITE_CHANNELS=
```

Notes:

- On Vercel, `KV_REST_API_URL` and `KV_REST_API_TOKEN` are provided by the Vercel KV integration.
- `PRIVATE_ACCESS_USER` and `PRIVATE_ACCESS_PASS` enable Basic Auth for the whole app except the OAuth callback and static assets.
- `FAVORITE_CHANNELS` seeds the favorites list as a comma-separated list of channel titles. If it is empty, the app also falls back to a legacy `favs.md` file when present.

### Google Cloud setup

1. Enable the YouTube Data API v3 in Google Cloud.
2. Create OAuth 2.0 credentials for a Web application.
3. Add these redirect URIs:
	- `http://localhost:3000/api/oauth/callback`
	- `https://YOUR_DOMAIN.vercel.app/api/oauth/callback`
4. Copy the client ID and client secret into `.env.local` or Vercel project variables.

### Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

### Vercel deployment

1. Import the repository into Vercel.
2. Add the environment variables from `.env.example`.
3. Create and connect a Vercel KV database to the project.
4. Deploy.
5. Make sure the Google redirect URI matches the production domain.

### Main endpoints

- `GET /api/oauth/start` starts the Google OAuth flow.
- `GET /api/oauth/callback` handles the OAuth callback and stores tokens.
- `GET /api/videos` returns recent videos and favorite channels, with a 15 minute cache.
- `POST /api/watch-later/:videoId` adds a video to the `0 Watch` playlist.
- `GET /api/favs` returns the current favorites list.

### Notes on the current architecture

- The production app is Next.js.
- `app.py` is kept only as historical reference.
- `client_secrets.json` and `favs.md` are no longer the primary production sources.

## Español

### Qué hace

- Muestra videos recientes de los canales a los que te suscribes en YouTube.
- Permite filtrar por canales favoritos u ocultarlos por completo.
- Marca localmente los videos vistos y puede atenuar las tarjetas ya vistas.
- Guarda videos en una playlist privada llamada `0 Watch` con una pulsación larga o un botón de un toque.
- Usa datos en caché cuando están disponibles, así la interfaz sigue funcionando ante problemas de autenticación o red.

### Stack

- Next.js 15 con App Router y Route Handlers
- Google OAuth 2.0 y YouTube Data API v3
- Vercel KV para tokens OAuth, favoritos y caché de videos
- localStorage del navegador para preferencias de UI, vistos y caché de respaldo

### Variables de entorno

Copia `.env.example` a `.env.local` y completa los valores:

```bash
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/api/oauth/callback
APP_BASE_URL=http://localhost:3000
PRIVATE_ACCESS_USER=
PRIVATE_ACCESS_PASS=
FAVORITE_CHANNELS=
```

Notas:

- En Vercel, `KV_REST_API_URL` y `KV_REST_API_TOKEN` los provee la integración de Vercel KV.
- `PRIVATE_ACCESS_USER` y `PRIVATE_ACCESS_PASS` activan Basic Auth para toda la app, excepto el callback OAuth y los activos estáticos.
- `FAVORITE_CHANNELS` inicializa la lista de favoritos como una lista separada por comas de nombres de canal. Si está vacía, la app también puede leer un archivo legado `favs.md` si existe.

### Configuración de Google Cloud

1. Habilita YouTube Data API v3 en Google Cloud.
2. Crea credenciales OAuth 2.0 para una Web application.
3. Agrega estas redirect URIs:
	- `http://localhost:3000/api/oauth/callback`
	- `https://TU_DOMINIO.vercel.app/api/oauth/callback`
4. Copia el client ID y el client secret en `.env.local` o en las variables del proyecto en Vercel.

### Desarrollo local

```bash
npm install
npm run dev
```

Abre `http://localhost:3000`.

### Deploy en Vercel

1. Importa el repositorio en Vercel.
2. Agrega las variables de entorno del archivo `.env.example`.
3. Crea y conecta una base de datos Vercel KV al proyecto.
4. Haz deploy.
5. Verifica que la redirect URI de Google coincida con el dominio de producción.

### Endpoints principales

- `GET /api/oauth/start` inicia el flujo OAuth con Google.
- `GET /api/oauth/callback` maneja el callback OAuth y guarda los tokens.
- `GET /api/videos` devuelve los videos recientes y los canales favoritos, con una caché de 15 minutos.
- `POST /api/watch-later/:videoId` agrega un video a la playlist `0 Watch`.
- `GET /api/favs` devuelve la lista actual de favoritos.

### Notas de arquitectura actual

- La app productiva ahora es Next.js.
- `app.py` se conserva solo como referencia histórica.
- `client_secrets.json` y `favs.md` ya no son la fuente principal en producción.
