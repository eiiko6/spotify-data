use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::{IntoResponse, Json},
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

use crate::AppState;

#[derive(Deserialize, Serialize)]
pub struct TokenResponse {
    pub access_token: String,
    pub token_type: String,
    pub expires_in: u64,
    pub refresh_token: String,
    pub scope: String,
}

#[derive(Deserialize)]
pub struct TokenQuery {
    pub access_token: String,
}

#[derive(Debug, Deserialize)]
pub struct TopRequestParams {
    pub access_token: String,
    pub range: Option<String>,
}

#[derive(Serialize)]
pub struct TrackInfo {
    pub name: String,
    pub album_image_url: String,
    pub artist_names: Vec<String>,
}

#[derive(Serialize)]
pub struct ArtistInfo {
    pub name: String,
    pub artist_image_url: String,
    pub artist_followers: u64,
    pub artist_profile_link: String,
}

#[derive(Deserialize)]
struct SpotifyTrackArtist {
    name: String,
}

#[derive(Deserialize)]
struct SpotifyTrackAlbumImage {
    url: String,
}

#[derive(Deserialize)]
struct SpotifyTrackAlbum {
    images: Vec<SpotifyTrackAlbumImage>,
}

#[derive(Deserialize)]
struct SpotifyTrackItem {
    name: String,
    artists: Vec<SpotifyTrackArtist>,
    album: SpotifyTrackAlbum,
}

#[derive(Deserialize)]
struct SpotifyTrackResponse {
    items: Vec<SpotifyTrackItem>,
}

#[derive(Deserialize)]
struct SpotifyArtistImage {
    url: String,
}

#[derive(Deserialize)]
struct SpotifyArtistFollowers {
    total: u64,
}

#[derive(Deserialize)]
struct SpotifyArtistItem {
    name: String,
    images: Vec<SpotifyArtistImage>,
    followers: SpotifyArtistFollowers,
    href: String,
}

#[derive(Deserialize)]
struct SpotifyArtistResponse {
    items: Vec<SpotifyArtistItem>,
}

pub async fn get_profile(
    State(state): State<Arc<AppState>>,
    Query(query): Query<TokenQuery>,
) -> impl IntoResponse {
    let res = state
        .client
        .get("https://api.spotify.com/v1/me")
        .bearer_auth(&query.access_token)
        .send()
        .await
        .unwrap();

    let json = res.text().await.unwrap();

    Json(serde_json::from_str::<serde_json::Value>(&json).unwrap())
}

pub async fn get_top_tracks(
    Query(params): Query<TopRequestParams>,
) -> Result<Json<Vec<TrackInfo>>, StatusCode> {
    let time_range = params.range.unwrap_or_else(|| "long_term".to_string());

    let url = format!(
        "https://api.spotify.com/v1/me/top/tracks?time_range={}&limit=50",
        time_range
    );

    let client = reqwest::Client::new();
    let resp = client
        .get(&url)
        .bearer_auth(&params.access_token)
        .send()
        .await
        .map_err(|e| {
            eprintln!("Request error: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    let body = resp.text().await.map_err(|e| {
        eprintln!("Response text error: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let spotify_resp: SpotifyTrackResponse = serde_json::from_str(&body).map_err(|e| {
        eprintln!("Deserialize error: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let tracks = spotify_resp
        .items
        .into_iter()
        .map(|item| TrackInfo {
            name: item.name,
            album_image_url: item
                .album
                .images
                .first()
                .map(|img| img.url.clone())
                .unwrap_or_default(),
            artist_names: item.artists.into_iter().map(|a| a.name).collect(),
        })
        .collect();

    Ok(Json(tracks))
}

pub async fn get_top_artists(
    Query(params): Query<TopRequestParams>,
) -> Result<Json<Vec<ArtistInfo>>, StatusCode> {
    let time_range = params.range.unwrap_or_else(|| "long_term".to_string());

    let url = format!(
        "https://api.spotify.com/v1/me/top/artists?time_range={}&limit=50",
        time_range
    );

    let client = reqwest::Client::new();
    let resp = client
        .get(&url)
        .bearer_auth(&params.access_token)
        .send()
        .await
        .map_err(|e| {
            eprintln!("Request error: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    let body = resp.text().await.map_err(|e| {
        eprintln!("Response text error: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let spotify_resp: SpotifyArtistResponse = serde_json::from_str(&body).map_err(|e| {
        eprintln!("Deserialize error: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let artists = spotify_resp
        .items
        .into_iter()
        .map(|item| ArtistInfo {
            name: item.name,
            artist_image_url: item
                .images
                .first()
                .map(|img| img.url.clone())
                .unwrap_or_default(),
            artist_followers: item.followers.total,
            artist_profile_link: item.href,
        })
        .collect();

    Ok(Json(artists))
}
