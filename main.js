// ----------------- CONFIG -----------------
const CLIENT_ID = "c6571b41056c4cccae0f0e645b036f61"; // <--- put your Spotify Client ID
const REDIRECT_URI = "https://ace21574-byte.github.io/spotify-now-playing-web/"; 
const SCOPES = ["user-read-playback-state","user-read-currently-playing"];
// ------------------------------------------

// Helper functions
function base64urlencode(str) {
  return btoa(String.fromCharCode.apply(null, new Uint8Array(str)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sha256(buffer) {
  return await crypto.subtle.digest("SHA-256", buffer);
}

// PKCE Login
async function login() {
  const verifier = Array.from(crypto.getRandomValues(new Uint8Array(64)))
    .map(b => ('0' + b.toString(16)).slice(-2)).join('');
  localStorage.setItem("verifier", verifier);

  const challenge = base64urlencode(await sha256(new TextEncoder().encode(verifier)));

  const url = `https://accounts.spotify.com/authorize?` +
    `response_type=code&client_id=${CLIENT_ID}` +
    `&scope=${encodeURIComponent(SCOPES.join(' '))}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&code_challenge_method=S256&code_challenge=${challenge}`;

  window.location = url;
}

// Parse query param
function getQueryParam(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}

// Exchange code for token
async function getToken(code) {
  const verifier = localStorage.getItem("verifier");
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: REDIRECT_URI,
    client_id: CLIENT_ID,
    code_verifier: verifier
  });

  const resp = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });

  return await resp.json();
}

// Fetch current playing track
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

window.onload = async () => {
  const code = getQueryParam("code");
  if (code) {
    const tokenData = await getToken(code);
    if (tokenData.access_token) {
      localStorage.setItem("access_token", tokenData.access_token);
      history.replaceState({}, document.title, "/"); // remove code from URL
    } else {
      console.error("Failed to get access token:", tokenData);
    }
  }

  const token = localStorage.getItem("access_token");
  if (token) {
    updateNowPlaying(token);
    setInterval(() => updateNowPlaying(token), 5000);
    document.getElementById("login-btn").style.display = "none";
  }
};
