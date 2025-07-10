import './style.css'

interface trackInfo {
  name: string;
  album_image_url: string;
  artist_names: string[];
}

interface artistInfo {
  name: string;
  artist_image_url: string;
  artist_followers: number;
  artist_profile_link: string;
}

interface UserProfile {
  display_name: string;
  id: string;
  email: string;
  product: string;
  external_urls: { spotify: string };
  followers: { total: number };
  country: string;
  images: { url: string }[];
}

// === Startup flow ===
const params = new URLSearchParams(window.location.search);
const code = params.get("code");
const storedToken = sessionStorage.getItem("access_token");

let accessToken: string | null = null;

if (storedToken !== null) {
  accessToken = storedToken;
} else if (code !== null) {
  const tokenRes = await fetch(`http://localhost:3000/callback?code=${code}`);
  const tokenData = await tokenRes.json();
  accessToken = tokenData.access_token;

  if (accessToken) {
    sessionStorage.setItem("access_token", accessToken);
  }

  window.history.replaceState({}, document.title, window.location.pathname);
} else {
  const storedClientId = localStorage.getItem("spotify_client_id");

  if (!storedClientId) {
    document.getElementById("startAuth")?.addEventListener("click", () => {
      const input = (document.getElementById("clientIdInput") as HTMLInputElement).value;
      if (input.trim()) {
        localStorage.setItem("spotify_client_id", input.trim());

        window.location.href = `http://localhost:3000/login?client_id=${encodeURIComponent(input.trim())}`;
      }
    });
  } else {
    window.location.href = `http://localhost:3000/login?client_id=${encodeURIComponent(storedClientId)}`;
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
