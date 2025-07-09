use axum::{
    extract::{Query, State},
    http::HeaderValue,
    response::{IntoResponse, Redirect},
    routing::get,
    serve, Json, Router,
};
use reqwest::Client;
use serde::Deserialize;
use std::{collections::HashMap, env, net::SocketAddr, sync::Arc};
use tokio::net::TcpListener;
use tower_http::cors::{Any, CorsLayer};

mod requests;
use requests::*;

#[derive(Clone)]
pub struct AppState {
    pub client: Client,
}

fn get_redirect_uri() -> String {
    std::env::var("SPOTIFY_REDIRECT_URI").unwrap()
}

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();
    let app_state = Arc::new(AppState {
        client: Client::new(),
    });

    let cors = CorsLayer::new()
        .allow_origin(
            get_redirect_uri()
                .replace("/spotify-data", "")
                .replace("/callback", "")
                .parse::<HeaderValue>()
                .unwrap(),
        )
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/login", get(login))
        .route("/callback", get(callback))
        .route("/profile", get(get_profile))
        .route("/top_tracks", get(get_top_tracks))
        .route("/top_artists", get(get_top_artists))
        .with_state(app_state)
        .layer(cors);

    let addr = SocketAddr::from(([127, 0, 0, 1], 3000));
    let listener = TcpListener::bind(addr).await.unwrap();

    println!("Backend running at http://{}", addr);
    serve(listener, app).await.unwrap();
}

async fn login() -> impl IntoResponse {
    let client_id = env::var("SPOTIFY_CLIENT_ID").unwrap();
    let redirect_uri = get_redirect_uri();

    let scopes = "user-read-private user-read-email user-top-read";

    let url = format!(
        "https://accounts.spotify.com/authorize?response_type=code&client_id={}&scope={}&redirect_uri={}&show_dialog=true",
        client_id,
        scopes,
        redirect_uri
    );

    Redirect::temporary(&url)
}

#[derive(Deserialize)]
struct CallbackQuery {
    code: String,
}

async fn callback(
    State(state): State<Arc<AppState>>,
    Query(params): Query<CallbackQuery>,
) -> impl IntoResponse {
    match exchange_code_for_token(&state.client, &params.code).await {
        Ok(token) => Json(token).into_response(),
        Err(err_msg) => {
            eprintln!("Error in /callback: {}", err_msg);
            (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                format!("Token error: {}", err_msg),
            )
                .into_response()
        }
    }
}

async fn exchange_code_for_token(client: &Client, code: &str) -> Result<TokenResponse, String> {
    let client_id = env::var("SPOTIFY_CLIENT_ID").unwrap();
    let client_secret = env::var("SPOTIFY_CLIENT_SECRET").unwrap();
    let redirect_uri = get_redirect_uri();

    let mut form = HashMap::new();
    form.insert("grant_type", "authorization_code");
    form.insert("code", code);
    form.insert("redirect_uri", &redirect_uri);

    let res = client
        .post("https://accounts.spotify.com/api/token")
        .basic_auth(client_id, Some(client_secret))
        .form(&form)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    let status = res.status();
    let body = res
        .text()
        .await
        .map_err(|e| format!("Body read failed: {}", e))?;

    if !status.is_success() {
        return Err(format!("Spotify returned error: {} → {}", status, body));
    }

    serde_json::from_str::<TokenResponse>(&body)
        .map_err(|e| format!("Token deserialization failed: {}", e))
}
