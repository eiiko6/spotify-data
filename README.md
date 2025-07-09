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
SPOTIFY_REDIRECT_URI=http://your-domain.com/spotify-data/callback
```

## Suggested nginx config

```nix
{ config, ... }:

let
  proxyHeaders = ''
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  '';
in {
  services.nginx = {
    enable = true;

    # Define rate limit zone globally
    appendHttpConfig = ''
      limit_req_zone $binary_remote_addr zone=one:10m rate=10r/m;
    '';

    virtualHosts."your-domain.com" = {
      root = "/var/www/";

      # spotify-data frontend
      locations."/spotify-data/" = {
        alias = "/var/www/spotify-data/";
        index = "index.html";
        tryFiles = "$uri $uri/ /index.html";
      };

      locations."/spotify-data/callback" = {
        root = "/var/www";
        tryFiles = "$uri $uri/ /spotify-data/index.html";
      };

      # spotify-data backend (spotify-api)
      locations."/spotify-api/login" = {
        proxyPass = "http://127.0.0.1:3000/login";
        extraConfig = proxyHeaders;
      };

      locations."/spotify-api/callback" = {
        proxyPass = "http://127.0.0.1:3000/callback$is_args$args";
        extraConfig = proxyHeaders;
      };

      locations."/spotify-api/profile" = {
        proxyPass = "http://127.0.0.1:3000/profile";
        extraConfig = proxyHeaders;
      };

      locations."/spotify-api/top_tracks" = {
        proxyPass = "http://127.0.0.1:3000/top_tracks";
        extraConfig = proxyHeaders;
      };

      locations."/spotify-api/top_artists" = {
        proxyPass = "http://127.0.0.1:3000/top_artists";
        extraConfig = proxyHeaders;
      };
    };
  };
}
```
