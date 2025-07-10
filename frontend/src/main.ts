import './style.css'

// === PKCE utilities ===
function generateCodeVerifier(): string {
  const array = new Uint8Array(64);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// === Startup flow ===
const params = new URLSearchParams(window.location.search);
const code = params.get("code");
const storedToken = sessionStorage.getItem("access_token");

let accessToken: string | null = null;

if (storedToken !== null) {
  accessToken = storedToken;
} else if (code !== null) {
  const codeVerifier = sessionStorage.getItem("pkce_code_verifier");
  if (!codeVerifier) {
    console.error("Missing code_verifier for PKCE flow");
  } else {
    const clientId = sessionStorage.getItem("spotify_client_id");
    const tokenRes = await fetch(`http://localhost:3000/callback?code=${code}&code_verifier=${codeVerifier}&client_id=${clientId}`);
    const tokenData = await tokenRes.json();
    accessToken = tokenData.access_token;

    if (accessToken) {
      sessionStorage.setItem("access_token", accessToken);
    }

    window.history.replaceState({}, document.title, window.location.pathname);
  }
} else {
  const storedClientId = sessionStorage.getItem("spotify_client_id");

  if (!storedClientId) {
    document.getElementById("startAuth")?.addEventListener("click", async () => {
      const input = (document.getElementById("clientIdInput") as HTMLInputElement).value;
      if (input.trim()) {
        sessionStorage.setItem("spotify_client_id", input.trim());
        sessionStorage.setItem("spotify_client_id", input.trim());

        const codeVerifier = generateCodeVerifier();
        const codeChallenge = await generateCodeChallenge(codeVerifier);
        sessionStorage.setItem("pkce_code_verifier", codeVerifier);

        window.location.href = `http://localhost:3000/login?client_id=${encodeURIComponent(input.trim())}&code_challenge=${codeChallenge}&code_challenge_method=S256`;
      }
    });
  } else {
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    sessionStorage.setItem("pkce_code_verifier", codeVerifier);

    window.location.href = `http://localhost:3000/login?client_id=${encodeURIComponent(storedClientId)}&code_challenge=${codeChallenge}&code_challenge_method=S256`;
  }
}

if (accessToken) {
  // Change the UI
  const promptEl = document.getElementById("client-id-prompt");
  if (promptEl) promptEl.style.display = "none";
  document.getElementById("profile")?.classList.remove("hidden");
  document.getElementById("topArtists")?.classList.remove("hidden");
  document.getElementById("topTracks")?.classList.remove("hidden");

  // Fetch data via backend
  const profile = await (await fetch(`http://localhost:3000/profile?access_token=${accessToken}`)).json();
  const topTracksLong = await (await fetch(`http://localhost:3000/top_tracks?access_token=${accessToken}&range=long_term`)).json();
  const topTracksMedium = await (await fetch(`http://localhost:3000/top_tracks?access_token=${accessToken}&range=medium_term`)).json();
  const topTracksShort = await (await fetch(`http://localhost:3000/top_tracks?access_token=${accessToken}&range=short_term`)).json();
  const topArtistsLong = await (await fetch(`http://localhost:3000/top_artists?access_token=${accessToken}&range=long_term`)).json();
  const topArtistsMedium = await (await fetch(`http://localhost:3000/top_artists?access_token=${accessToken}&range=medium_term`)).json();
  const topArtistsShort = await (await fetch(`http://localhost:3000/top_artists?access_token=${accessToken}&range=short_term`)).json();

  // Display
  populateUIProfile(profile);
  populateUIElements("long-topTracks", topTracksLong, "long-topArtists", topArtistsLong);
  populateUIElements("medium-topTracks", topTracksMedium, "medium-topArtists", topArtistsMedium);
  populateUIElements("short-topTracks", topTracksShort, "short-topArtists", topArtistsShort);
}

// === UI Functions ===

function populateUIProfile(profile: UserProfile) {
  document.getElementById("displayName")!.innerText = profile.display_name;
  if (profile.images && profile.images.length > 0) {
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
  if (tracksContainer) {
    tracks.forEach((track, index) => {
      const trackContainer = document.createElement("div");
      trackContainer.classList.add("track-container");

      const trackNumberDiv = document.createElement("div");
      trackNumberDiv.textContent = (index + 1).toString();
      trackNumberDiv.classList.add("number");
      trackContainer.appendChild(trackNumberDiv);

      const trackImage = new Image();
      trackImage.src = track.album_image_url;
      trackImage.alt = track.name;
      trackImage.classList.add("track-image");
      trackContainer.appendChild(trackImage);

      const trackInfoDiv = document.createElement("div");
      trackInfoDiv.textContent = track.name + " by " + track.artist_names.join(", ");
      trackContainer.appendChild(trackInfoDiv);

      tracksContainer.appendChild(trackContainer);
    });
  }

  // artists
  const artistsContainer = document.getElementById(artistsContainerId);
  if (artistsContainer) {
    artists.forEach((artist, index) => {
      const artistContainer = document.createElement("div");
      artistContainer.classList.add("artist-container");

      const artistNumberDiv = document.createElement("div");
      artistNumberDiv.textContent = (index + 1).toString();
      artistNumberDiv.classList.add("number");
      artistContainer.appendChild(artistNumberDiv);

      const artistImage = new Image();
      artistImage.src = artist.artist_image_url;
      artistImage.alt = artist.name;
      artistImage.classList.add("artist-image");
      artistContainer.appendChild(artistImage);

      const artistDiv = document.createElement("div");
      artistDiv.textContent = `${artist.name}, ${artist.artist_followers} followers`;
      artistContainer.appendChild(artistDiv);

      artistsContainer.appendChild(artistContainer);
    });
  }
}
