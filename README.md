# YouTube Subscriptions Viewer (Vercel + Next.js)

Aplicacion web para ver videos recientes de tus suscripciones de YouTube, filtrar favoritos y guardar en tu playlist privada desde una UI limpia.

## Stack actual

- Next.js (App Router + Route Handlers)
- Google OAuth 2.0 + YouTube Data API v3
- Vercel KV para tokens OAuth, cache de videos y favoritos
- Deploy en Vercel (sin ejecutar Python en produccion)

## Variables de entorno

Copia `.env.example` a `.env.local` y completa:

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
- En Vercel, `KV_REST_API_URL` y `KV_REST_API_TOKEN` los inyecta la integracion de Vercel KV.
- `PRIVATE_ACCESS_USER` y `PRIVATE_ACCESS_PASS` activan proteccion Basic Auth para mantener la app privada.

## Google Cloud setup

1. En Google Cloud, habilita YouTube Data API v3.
2. Crea credenciales OAuth 2.0 tipo Web application.
3. Agrega redirect URIs:
	- `http://localhost:3000/api/oauth/callback`
	- `https://TU_DOMINIO.vercel.app/api/oauth/callback`
4. Copia `client_id` y `client_secret` al `.env.local` o Variables de Vercel.

## Desarrollo local

```bash
npm install
npm run dev
```

Abrir `http://localhost:3000`.

## Deploy en Vercel

1. Importa el repo en Vercel.
2. Agrega las variables de entorno del archivo `.env.example`.
3. Crea y vincula un KV database (Vercel KV) al proyecto.
4. Deploy.
5. Verifica que la redirect URI de Google coincida con el dominio productivo.

## Endpoints principales

- `GET /api/oauth/start`: inicia OAuth con Google
- `GET /api/oauth/callback`: callback OAuth
- `GET /api/videos`: trae videos recientes (cache 15 min)
- `POST /api/watch-later/:videoId`: agrega video a playlist `0 Watch`
- `GET /api/favs`: favoritos

## Migracion desde Flask

- Se mantiene `app.py` como referencia historica.
- El runtime productivo ahora es Next.js.
- Ya no se usa `client_secrets.json` ni `favs.md` en produccion como fuente principal.
