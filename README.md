# YouTube Subscriptions Viewer

A local web app that displays recent videos from your YouTube subscriptions in a clean, grid-based interface. Authenticate with your Google account, browse the latest uploads, and save videos to a custom "Watch Later" playlist — all without the noise of the YouTube algorithm.

## Features

- **OAuth 2.0 login** — secure Google authentication to access your subscriptions.
- **Recent videos grid** — shows uploads from the last 30 days, filtered to 3+ minute videos.
- **Favorite channels** — define favorites in `favs.md` (one channel name per line). Toggle a filter to show only favorites, or hide them to see everything else.
- **Dim seen videos** — videos you have scrolled past are automatically dimmed so you can focus on what is new.
- **Watch Later** — one-click (or long-press on mobile) to add a video to a private YouTube playlist.
- **15-minute cache** — API responses are cached to reduce quota usage. Force a refresh anytime.
- **Responsive** — adapts from 2 to 6 columns depending on screen width.

## Requirements

- Python 3.9+
- A Google Cloud project with the **YouTube Data API v3** enabled and OAuth 2.0 credentials (`client_secrets.json`).

## Setup

```bash
git clone https://github.com/<your-user>/youtube-subscriptions.git
cd youtube-subscriptions
python -m venv .venv
.venv\Scripts\activate      # Windows
# source .venv/bin/activate  # macOS / Linux
pip install -r requirements.txt
```

Place your `client_secrets.json` in the project root.

Optionally create a `favs.md` file with your favorite channel names (one per line):

```
Channel Name One
Channel Name Two
```

## Run

```bash
python app.py
```

Open `http://localhost:5000` and sign in with Google.

## Tech Stack

| Layer    | Technology |
|----------|-----------|
| Backend  | Flask, Google API Python Client |
| Frontend | HTML, CSS (Inter + Font Awesome), vanilla JS |
| Auth     | Google OAuth 2.0 (offline access) |

---

# YouTube Subscriptions Viewer (Español)

Aplicación web local que muestra los videos recientes de tus suscripciones de YouTube en una grilla limpia. Autenticás con tu cuenta de Google, navegás las últimas subidas y guardás videos en una playlist privada de "Watch Later", todo sin el ruido del algoritmo de YouTube.

## Funcionalidades

- **Login OAuth 2.0** — autenticación segura con Google para acceder a tus suscripciones.
- **Grilla de videos recientes** — muestra subidas de los últimos 30 días, filtrando videos de menos de 3 minutos.
- **Canales favoritos** — definí tus favoritos en `favs.md` (un nombre de canal por línea). Activá el filtro para ver solo favoritos, o activa el icono de ocultar para ver todo menos los favoritos.
- **Atenuar videos vistos** — los videos que ya scrolleaste se atenúan automáticamente para que te enfoques en lo nuevo.
- **Watch Later** — un click (o long-press en móvil) para agregar un video a una playlist privada de YouTube.
- **Caché de 15 minutos** — las respuestas de la API se cachean para reducir el uso de cuota. Podés forzar una actualización en cualquier momento.
- **Responsive** — se adapta de 2 a 6 columnas según el ancho de pantalla.

## Requisitos

- Python 3.9+
- Un proyecto de Google Cloud con la **YouTube Data API v3** habilitada y credenciales OAuth 2.0 (`client_secrets.json`).

## Instalación

```bash
git clone https://github.com/<tu-usuario>/youtube-subscriptions.git
cd youtube-subscriptions
python -m venv .venv
.venv\Scripts\activate      # Windows
# source .venv/bin/activate  # macOS / Linux
pip install -r requirements.txt
```

Colocá tu `client_secrets.json` en la raíz del proyecto.

Opcionalmente creá un archivo `favs.md` con los nombres de tus canales favoritos (uno por línea):

```
Nombre del Canal Uno
Nombre del Canal Dos
```

## Ejecutar

```bash
python app.py
```

Abrí `http://localhost:5000` e iniciá sesión con Google.
