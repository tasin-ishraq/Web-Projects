// public/js/player.js  ← FINAL WORKING VERSION
let songs = [], currentIndex = 0;
const audio = new Audio();

document.addEventListener("DOMContentLoaded", async () => {
  // Load songs
  try {
    const res = await fetch("/api/songs");
    songs = await res.json();
    console.log("Songs loaded:", songs); // ← CHECK THIS IN CONSOLE!
    renderSongs();
  } catch (err) {
    document.getElementById("songGrid").innerHTML = "<p style='text-align:center;color:red;'>Failed to load songs. Check console.</p>";
    console.error(err);
  }

  // Dark mode from localStorage
  if (localStorage.getItem("dark") === "true") document.body.classList.add("dark");
});

function renderSongs() {
  const grid = document.getElementById("songGrid");
  if (!grid) return;
  grid.innerHTML = songs.length === 0 
    ? "<p style='text-align:center;padding:50px;'>No songs in database yet.</p>"
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
  document.getElementById("currentSongTitle").textContent = `${s.title} - ${s.artist || 'Unknown'}`;
  document.getElementById("playPauseBtn").textContent = "Pause";
  highlightCurrent();
}

function highlightCurrent() {
  document.querySelectorAll(".song-card").forEach((c, idx) => {
    c.style.outline = idx === currentIndex ? "4px solid #00bcd4" : "none";
  });
}

// Player controls
document.getElementById("playPauseBtn").onclick = () => {
  audio.paused ? audio.play() : audio.pause();
  document.getElementById("playPauseBtn").textContent = audio.paused ? "Play" : "Pause";
};
document.getElementById("prevBtn").onclick = () => playSong((currentIndex - 1 + songs.length) % songs.length);
document.getElementById("nextBtn").onclick = () => playSong((currentIndex + 1) % songs.length);

// Dark mode
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

// Progress & volume
audio.ontimeupdate = () => {
  if (audio.duration) {
    const percent = (audio.currentTime / audio.duration) * 100;
    document.getElementById("progress").value = percent;
    document.getElementById("currentTime").textContent = formatTime(audio.currentTime);
    document.getElementById("duration").textContent = formatTime(audio.duration);
  }
};
document.getElementById("progress").oninput = (e) => {
  audio.currentTime = (e.target.value / 100) * audio.duration;
};
document.getElementById("volume").oninput = (e) => audio.volume = e.target.value;

function formatTime(s) {
  s = Math.floor(s);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}