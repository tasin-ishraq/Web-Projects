// public/js/player.js ← FINAL VERSION THAT SHOWS SONGS + COVERS + PLAYLISTS
let songs = [], currentIndex = 0, audio = new Audio();
let isPlaying = false, isShuffle = false, isRepeat = false;

document.addEventListener("DOMContentLoaded", async () => {
  await loadSongs();
  loadPlaylists();

  // Dark mode
  if (localStorage.getItem("dark") === "true") document.body.classList.add("dark");

  // Username from URL
  const params = new URLSearchParams(location.search);
  const user = params.get("user");
  if (user) document.getElementById("usernameDisplay").textContent = decodeURIComponent(user);
});

async function loadSongs() {
  try {
    const res = await fetch("/api/songs");
    songs = await res.json();
    console.log("Songs loaded:", songs); // ← Check browser console (F12)
    renderSongs();
  } catch (err) {
    document.getElementById("songGrid").innerHTML = "<p style='color:red;text-align:center;'>No songs or session expired. <a href='/logout'>Logout & login again</a></p>";
  }
}

function renderSongs() {
  const grid = document.getElementById("songGrid");
  grid.innerHTML = songs.length === 0 
    ? "<p style='text-align:center;padding:50px;color:#666;'>No songs in your library yet.</p>"
    : "";

  songs.forEach((song, i) => {
    const card = document.createElement("div");
    card.className = "song-card";
    card.innerHTML = `
      <img src="images/${song.cover || 'default.jpg'}" class="song-cover" alt="${song.title}">
      <div class="song-info">
        <h3>${song.title}</h3>
        <p>${song.artist || 'Unknown'}</p>
      </div>
      <button class="favorite-btn ${song.is_favorite ? 'favorited' : ''}" data-id="${song.id}">
        ${song.is_favorite ? '♥' : '♡'}
      </button>
    `;
    card.onclick = (e) => {
      if (!e.target.classList.contains("favorite-btn")) playSong(i);
    };
    grid.appendChild(card);
  });
  setupFavorites();
}

function setupFavorites() {
  document.querySelectorAll(".favorite-btn").forEach(btn => {
    btn.onclick = async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const res = await fetch("/api/toggle-favorite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ song_id: id })
      });
      const data = await res.json();
      btn.classList.toggle("favorited", data.is_favorite);
      btn.textContent = data.is_favorite ? "♥" : "♡";
    };
  });
}

function playSong(i) {
  currentIndex = i;
  const s = songs[i];
  audio.src = `songs/${s.filename}`;
  audio.play();
  isPlaying = true;
  document.getElementById("playPauseBtn").textContent = "Pause";
  document.getElementById("currentSongTitle").textContent = `${s.title} - ${s.artist || 'Unknown'}`;
}

// Player Controls
document.getElementById("playPauseBtn").onclick = () => {
  if (isPlaying) audio.pause(); else audio.play();
  isPlaying = !isPlaying;
  document.getElementById("playPauseBtn").textContent = isPlaying ? "Pause" : "Play";
};
document.getElementById("prevBtn").onclick = () => playSong((currentIndex - 1 + songs.length) % songs.length);
document.getElementById("nextBtn").onclick = () => playSong((currentIndex + 1) % songs.length);

// Playlists
async function loadPlaylists() {
  const res = await fetch("/api/playlists");
  const lists = await res.json();
  const container = document.getElementById("playlistsList");
  container.innerHTML = "";
  lists.forEach(pl => {
    const div = document.createElement("div");
    div.className = "playlist-item";
    div.textContent = pl.name;
    container.appendChild(div);
  });
}

document.getElementById("newPlaylistBtn").onclick = async () => {
  const name = prompt("Playlist name:");
  if (name) {
    await fetch("/api/playlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name })
    });
    loadPlaylists();
  }
};

// Dark Mode
document.getElementById("darkModeToggle").onclick = () => {
  document.body.classList.toggle("dark");
  localStorage.setItem("dark", document.body.classList.contains("dark"));
};

// Search
document.getElementById("searchInput").oninput = (e) => {
  const term = e.target.value.toLowerCase();
  document.querySelectorAll(".song-card").forEach((card, i) => {
    const text = `${songs[i].title} ${songs[i].artist}`.toLowerCase();
    card.style.display = text.includes(term) ? "" : "none";
  });
};