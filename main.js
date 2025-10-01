// ----------------- CONFIG -----------------
const CLIENT_ID = "c6571b41056c4cccae0f0e645b036f61"; // Your Spotify Client ID
const REDIRECT_URI = "https://ace21574-byte.github.io/spotify-now-playing-web/"; 
const SCOPES = ["user-read-playback-state","user-read-currently-playing"];
// ------------------------------------------

// Helper to get access token from URL hash
function getAccessTokenFromHash() {
  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  return params.get("access_token");
}

// Redirect to Spotify login (Implicit Grant)
function login() {
  const authUrl = `https://accounts.spotify.com/authorize?` +
                  `client_id=${CLIENT_ID}` +
                  `&response_type=token` +
                  `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
                  `&scope=${encodeURIComponent(SCOPES.join(" "))}`;
  window.location = authUrl;
}

// Fetch currently playing track
async function updateNowPlaying(token) {
  try {
    const resp = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (resp.status === 200) {
      const data = await resp.json();
      document.getElementById("title").textContent = data.item.name;
      document.getElementById("artist").textContent = data.item.artists.map(a => a.name).join(", ");
      document.getElementById("album").src = data.item.album.images[0].url;
    } else {
      document.getElementById("title").textContent = "Not Playing";
      document.getElementById("artist").textContent = "";
      document.getElementById("album").src = "";
    }
  } catch (err) {
    console.error("Error fetching currently playing:", err);
  }
}

// Main logic
document.getElementById("login-btn").addEventListener("click", login);

window.onload = () => {
  let token = localStorage.getItem("access_token");

  // Check if Spotify returned access token in URL hash
  const hashToken = getAccessTokenFromHash();
  if (hashToken) {
    token = hashToken;
    localStorage.setItem("access_token", token);
    window.location.hash = ""; // remove token from URL
  }

  if (token) {
    updateNowPlaying(token);
    setInterval(() => updateNowPlaying(token), 5000);
    document.getElementById("login-btn").style.display = "none";
  }
};
