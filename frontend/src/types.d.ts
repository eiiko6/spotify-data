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


