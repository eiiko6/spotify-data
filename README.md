# Spotify Data

A small website made with [Vite](https://vitejs.dev/) + [TypeScript](https://www.typescriptlang.org/) and a [Rust](https://www.rust-lang.org/) backend using [Axum](https://github.com/tokio-rs/axum).  
It shows you info from your Spotify account: top tracks & artists over multiple time ranges, your profile, and more.

![I'll add a preview image here]

## How does it work?

- **Frontend** (TypeScript, Vite):  
  A basic web page that handles UI and authentication redirect logic. It fetches with your Rust backend.
  
- **Backend** (Rust, Axum):  
  Handles Spotify OAuth, token exchange, and API requests (e.g. `/profile`, `/top_tracks`, etc).

---

## Environment Setup

You **must provide the following environment variables** for the backend:

```bash
SPOTIFY_CLIENT_ID=your-client-id-here
SPOTIFY_CLIENT_SECRET=your-client-secret-here
```
