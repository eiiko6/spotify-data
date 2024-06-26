// Everything is client-side cause I'm lazy

import './style.css'

const params = new URLSearchParams(window.location.search);
const code = params.get("code");

const clientId = localStorage.getItem("clientId");

if (!clientId) {
  const userInput = prompt("Enter clientId")?.toString();
  if (userInput) {
    localStorage.setItem("clientId", userInput); // Store the clientId in localStorage
    redirectToAuthCodeFlow(userInput);
  } else {
    // Handle the case when the user cancels the prompt
    console.log("User canceled the prompt.");
  }
} else {
  if (!code) {
    redirectToAuthCodeFlow(clientId);
  } else {
    console.log("Start");
    const accessToken = await getAccessToken(clientId, code);
    const profile = await fetchProfile(accessToken);

    const topTracksLong = await getTopTracks(accessToken, "long", 50); // Top tracks list arguments
    const topTracksMedium = await getTopTracks(accessToken, "medium", 50);
    const topTracksShort = await getTopTracks(accessToken, "short", 50);
    const topArtistsLong = await getTopArtists(accessToken, "long", 50); // Top artists list arguments
    const topArtistsMedium = await getTopArtists(accessToken, "medium", 50);
    const topArtistsShort = await getTopArtists(accessToken, "short", 50);

    // Test
    console.log(topTracksLong);
    console.log(profile);
    console.log(getPlaylists(accessToken, profile.id)); // The idea was to create a "search in playlists" bar but it can involve too many requests

    populateUIProfile(profile);
    populateUIElements("long-topTracks", topTracksLong, "long-topArtists", topArtistsLong)
    populateUIElements("medium-topTracks", topTracksMedium, "medium-topArtists", topArtistsMedium)
    populateUIElements("short-topTracks", topTracksShort, "short-topArtists", topArtistsShort)
  }
}

export async function redirectToAuthCodeFlow(clientId: string) {
    const verifier = generateCodeVerifier(128);
    const challenge = await generateCodeChallenge(verifier);

    localStorage.setItem("verifier", verifier);

    const params = new URLSearchParams();
    params.append("client_id", clientId);
    params.append("response_type", "code");
    params.append("redirect_uri", "http://localhost:5173/callback"); // https://eiiko6.github.io/spotify-data/callback
    params.append("scope", "user-read-private user-read-email user-top-read user-read-playback-state playlist-read-private user-library-read");
    params.append("code_challenge_method", "S256");
    params.append("code_challenge", challenge);

    document.location = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

function generateCodeVerifier(length: number) {
    let text = '';
    let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

async function generateCodeChallenge(codeVerifier: string) {
    const data = new TextEncoder().encode(codeVerifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

export async function getAccessToken(clientId: string, code: string): Promise<string> {
    const verifier = localStorage.getItem("verifier");

    const params = new URLSearchParams();
    params.append("client_id", clientId);
    params.append("grant_type", "authorization_code");
    params.append("code", code);
    params.append("redirect_uri", "http://localhost:5173/callback");
    params.append("code_verifier", verifier!);

    const result = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params
    });

    const { access_token } = await result.json();
    return access_token;
}

async function fetchProfile(token: string): Promise<UserProfile> {
    const result = await fetch("https://api.spotify.com/v1/me", {
        method: "GET", headers: { Authorization: `Bearer ${token}` }
    });
    return await result.json();
}

// Could be combined with `fetchProfile()`
async function fetchWebApi(endpoint: string, method: string, token: string): Promise<any> {
    const res = await fetch(`https://api.spotify.com/${endpoint}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      method,
    });
    return res;
}

interface trackInfo {
    name: string;
    albumImageUrl: string;
    artistNames: string[];
}

interface artistInfo {
  name: string;
  artistImageUrl: string;
  artistFollowers: number;
  artistProfileLink: string;
}

interface playlistInfo {
  playlistId: string;
  tracksHref: string;
}

export async function getTopTracks(token: string, time_range: string, limit: number): Promise<trackInfo[]> {
    // Endpoint reference : https://developer.spotify.com/documentation/web-api/reference/get-users-top-artists-and-tracks
    const response = await fetchWebApi(
        'v1/me/top/tracks?time_range=' + time_range + '_term&limit=' + limit, // Request
        'GET',
        token
    );
    const data = await response.json(); // Parse the JSON content of the response
    return data.items.map((item: any) => ({
        name: item.name,
        albumImageUrl: item.album.images[0].url,
        artistNames: item.artists.map((artist: any) => artist.name),
    }));
}

export async function getTracks(token: string, time_range: string, limit: number): Promise<trackInfo[]> {
  // Endpoint reference : https://developer.spotify.com/documentation/web-api/reference/get-users-top-artists-and-tracks
  const response = await fetchWebApi(
      'v1/me/tracks?time_range=' + time_range + '_term&limit=' + limit, // Request
      'GET',
      token
  );
  const data = await response.json(); // Parse the JSON content of the response
  return data.items.map((item: any) => ({
      name: item.name,
      albumImageUrl: item.album.images[0].url,
      artistNames: item.artists.map((artist: any) => artist.name),
  }));
}

export async function getTopArtists(token: string, time_range: string, limit: number): Promise<artistInfo[]> {
  // Endpoint reference : https://developer.spotify.com/documentation/web-api/reference/get-users-top-artists-and-tracks
  const response = await fetchWebApi(
      'v1/me/top/artists?time_range=' + time_range + '_term&limit=' + limit, // Request
      'GET',
      token
  );
  const data = await response.json(); // Parse the JSON content of the response
  return data.items.map((item: any) => ({
      name: item.name,
      artistImageUrl: item.images.length > 0 ? item.images[0].url: '', // Check if images array is not empty
      artistFollowers: item.followers.total,
      artistProfileLink: item.href
  }));
}

export async function getPlaylists(token: string, id: string): Promise<playlistInfo[]> {
  const response = await fetchWebApi(
      'v1/users/' + id +'/playlists?limit=50&offset=0',
      'GET',
      token
  );
  const data = await response.json(); // Parse the JSON content of the response
  return data.items.map((item: any) => ({
      playlistId: item.id,
      tracksHref: item.tracks.href
  }));
}

function populateUIProfile(profile: UserProfile) { // Display data on the page
    document.getElementById("displayName")!.innerText = profile.display_name;
    if (profile.images[0]) {
        const profileImage = new Image(120, 120);
        profileImage.src = profile.images[0].url;
        document.getElementById("avatar")!.appendChild(profileImage);
    }
    document.getElementById("id")!.innerText = profile.id;
    document.getElementById("email")!.innerText = profile.email;
    document.getElementById("product")!.innerText = profile.product;
    document.getElementById("uri")!.innerText = "https://open.spotify.com/user/" + profile.id;
    document.getElementById("uri")!.setAttribute("href", profile.external_urls.spotify);
    document.getElementById("followers")!.innerText = profile.followers.total.toString();
    document.getElementById("country")!.innerText = profile.country;
}

function populateUIElements(tracksContainerId: string, tracks: trackInfo[], artistsContainerId: string, artists: artistInfo[]) {
  // tracks
  const tracksContainer = document.getElementById(tracksContainerId);
    if (!tracksContainer) return;
  
    tracks.forEach((track, index) => { // Create new divs for each track in range
      const trackContainer = document.createElement("div");
      trackContainer.classList.add("track-container"); // Class for styling

      // Track number
      const trackNumber = (index + 1).toString();

      const trackNumberDiv = document.createElement("div");
      trackNumberDiv.textContent = trackNumber
      trackNumberDiv.classList.add("number");
      trackContainer.appendChild(trackNumberDiv);

      // Track Image
      const trackImage = new Image();
      trackImage.src = track.albumImageUrl;
      trackImage.alt = track.name;
      trackImage.classList.add("track-image");
      trackContainer.appendChild(trackImage);
      
      // Track info
      const trackInfoDiv = document.createElement("div");
      trackInfoDiv.textContent = track.name + " by " + track.artistNames.join(", ");
      trackContainer.appendChild(trackInfoDiv);

      tracksContainer.appendChild(trackContainer);
    });
    
  // Artists
  const artistsContainer = document.getElementById(artistsContainerId);
    if (!artistsContainer) return;
  
    artists.forEach((artist, index) => { // Create new divs for each artist in range
      const artistContainer = document.createElement("div");
      artistContainer.classList.add("artist-container"); // Class for styling

      // Artist number
      const artistNumber = (index + 1).toString();

      const artistNumberDiv = document.createElement("div");
      artistNumberDiv.textContent = artistNumber
      artistNumberDiv.classList.add("number");
      artistContainer.appendChild(artistNumberDiv);

      // Artist image
      const artistImage = new Image();
      artistImage.src = artist.artistImageUrl;
      artistImage.alt = artist.name;
      artistImage.classList.add("artist-image");
      artistContainer.appendChild(artistImage);
      
      // Artist info
      const artistDiv = document.createElement("div");
      artistDiv.textContent = artist.name + ", " + artist.artistFollowers + " followers";
      artistContainer.appendChild(artistDiv);

      artistsContainer.appendChild(artistContainer);
    });
}
