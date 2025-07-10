import './style.css';

// === Auth + Startup ===
let accessToken: string | null = null;

// Try to extract from URL fragment first
const hashParams = new URLSearchParams(window.location.hash.substring(1));
const token = hashParams.get("access_token");

if (token) {
  sessionStorage.setItem("access_token", token);
  window.location.hash = "";
  accessToken = token;
} else {
  const storedToken = sessionStorage.getItem("access_token");
  if (storedToken) {
    accessToken = storedToken;
  }
}

if (!accessToken) {
  document.getElementById("startAuth")?.addEventListener("click", () => {
    const input = (document.getElementById("clientIdInput") as HTMLInputElement).value.trim();
    if (input) {
      localStorage.setItem("spotify_client_id", input);

      const scopes = [
        "user-read-private",
        "user-read-email",
        "user-top-read",
      ].join(" ");

      const redirectUri = window.location.origin + "/spotify-data/callback";

      console.log(redirectUri);

      const authUrl = new URL("https://accounts.spotify.com/authorize");
      authUrl.searchParams.set("client_id", input);
      authUrl.searchParams.set("response_type", "token");
      authUrl.searchParams.set("redirect_uri", redirectUri);
      authUrl.searchParams.set("scope", scopes);
      authUrl.searchParams.set("show_dialog", "true");

      window.location.href = authUrl.toString();
    }
  });
} else {
  // Auth successful
  document.getElementById("client-id-prompt")?.classList.add("hidden");
  document.getElementById("profile")?.classList.remove("hidden");
  document.getElementById("topArtists")?.classList.remove("hidden");
  document.getElementById("topTracks")?.classList.remove("hidden");

  const profile = await (await fetch(`http://localhost:3000/profile?access_token=${accessToken}`)).json();
  const topTracksLong = await (await fetch(`http://localhost:3000/top_tracks?access_token=${accessToken}&range=long_term`)).json();
  const topTracksMedium = await (await fetch(`http://localhost:3000/top_tracks?access_token=${accessToken}&range=medium_term`)).json();
  const topTracksShort = await (await fetch(`http://localhost:3000/top_tracks?access_token=${accessToken}&range=short_term`)).json();
  const topArtistsLong = await (await fetch(`http://localhost:3000/top_artists?access_token=${accessToken}&range=long_term`)).json();
  const topArtistsMedium = await (await fetch(`http://localhost:3000/top_artists?access_token=${accessToken}&range=medium_term`)).json();
  const topArtistsShort = await (await fetch(`http://localhost:3000/top_artists?access_token=${accessToken}&range=short_term`)).json();

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
