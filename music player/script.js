const audio = document.getElementById("audio");
const playBtn = document.getElementById("play");
const nextBtn = document.getElementById("next");
const prevBtn = document.getElementById("prev");
const shuffleBtn = document.getElementById("shuffle");
const repeatBtn = document.getElementById("repeat");
const volumeSlider = document.getElementById("volume");
const progress = document.getElementById("progress");
const currentTimeEl = document.getElementById("current");
const durationEl = document.getElementById("duration");
const titleEl = document.getElementById("title");
const artistEl = document.getElementById("artist");
const coverEl = document.getElementById("cover");
const fileInput = document.getElementById("fileInput");
const playlistEl = document.getElementById("playlist");
const lyricsEl = document.getElementById("lyrics-text");
const canvas = document.getElementById("visualizer");

let playlist = [];
let currentIndex = 0;
let isShuffle = false;
let isRepeat = false;
let audioCtx, analyser, source, bufferLength, dataArray;

// Format seconds to mm:ss
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${mins}:${secs}`;
}

// Load song with metadata, lyrics, cover
function loadSong(index) {
  if (!playlist[index]) return;
  const file = playlist[index];
  audio.src = URL.createObjectURL(file);
  titleEl.textContent = file.name;
  artistEl.textContent = "Unknown Artist";
  coverEl.src = "assets/images/default.jpg";
  lyricsEl.textContent = "Fetching lyrics...";

  readTags(file);
  fetchLyrics(file.name);

  setActivePlaylistItem(index);
  audio.load();
  audio.play();
  playBtn.textContent = "⏸️";
}

// Read MP3 metadata
function readTags(file) {
  jsmediatags.read(file, {
    onSuccess: function (tag) {
      const { title, artist, picture } = tag.tags;
      if (title) titleEl.textContent = title;
      if (artist) artistEl.textContent = artist;
      if (picture) {
        const base64 = picture.data.reduce(
          (acc, byte) => acc + String.fromCharCode(byte),
          ""
        );
        const imageUrl = `data:${picture.format};base64,${btoa(base64)}`;
        coverEl.src = imageUrl;
      }
    },
    onError: function (error) {
      console.log("Tag read error:", error.type, error.info);
    },
  });
}

// Fetch lyrics using lyrics.ovh
function fetchLyrics(title) {
  const query = title.split(".")[0];
  fetch(`https://api.lyrics.ovh/v1/Adele/${encodeURIComponent(query)}`)
    .then((res) => res.json())
    .then((data) => {
      if (data.lyrics) {
        lyricsEl.textContent = data.lyrics;
      } else {
        lyricsEl.textContent = "Lyrics not found.";
      }
    })
    .catch(() => {
      lyricsEl.textContent = "Lyrics API failed.";
    });
}

// Highlight playing song
function setActivePlaylistItem(index) {
  document.querySelectorAll(".playlist-item").forEach((item, i) => {
    item.classList.toggle("active", i === index);
  });
}

// Display playlist
function displayPlaylist() {
  playlistEl.innerHTML = "";
  playlist.forEach((file, index) => {
    const div = document.createElement("div");
    div.className = "playlist-item";
    div.textContent = file.name;
    div.addEventListener("click", () => {
      currentIndex = index;
      loadSong(index);
    });
    playlistEl.appendChild(div);
  });
}

// Visualizer setup
function setupVisualizer() {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  analyser = audioCtx.createAnalyser();
  source = audioCtx.createMediaElementSource(audio);
  source.connect(analyser);
  analyser.connect(audioCtx.destination);

  bufferLength = analyser.frequencyBinCount;
  dataArray = new Uint8Array(bufferLength);

  drawVisualizer();
}

function drawVisualizer() {
  const ctx = canvas.getContext("2d");
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;

  function draw() {
    requestAnimationFrame(draw);
    analyser.getByteFrequencyData(dataArray);
    ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const barWidth = (canvas.width / bufferLength) * 2.5;
    let x = 0;
    for (let i = 0; i < bufferLength; i++) {
      const barHeight = dataArray[i] / 2;
      const hue = i % 360;
      ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
      ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
      x += barWidth + 1;
    }
  }

  draw();
}

// 📦 EVENTS

// Initialize visualizer once
document.addEventListener(
  "click",
  () => {
    if (!audioCtx) setupVisualizer();
  },
  { once: true }
);

// Play/Pause toggle
playBtn.addEventListener("click", () => {
  if (audio.paused) {
    audio.play();
    playBtn.textContent = "⏸️";
  } else {
    audio.pause();
    playBtn.textContent = "▶️";
  }
});

// Next / Previous
nextBtn.addEventListener("click", () => {
  currentIndex = (currentIndex + 1) % playlist.length;
  loadSong(currentIndex);
});

prevBtn.addEventListener("click", () => {
  currentIndex = (currentIndex - 1 + playlist.length) % playlist.length;
  loadSong(currentIndex);
});

// Shuffle
shuffleBtn.addEventListener("click", () => {
  isShuffle = !isShuffle;
  shuffleBtn.style.background = isShuffle ? "#88ff88" : "rgba(255,255,255,0.2)";
});

// Repeat
repeatBtn.addEventListener("click", () => {
  isRepeat = !isRepeat;
  repeatBtn.style.background = isRepeat ? "#88ddff" : "rgba(255,255,255,0.2)";
});

// Volume
volumeSlider.addEventListener("input", () => {
  audio.volume = volumeSlider.value;
});

// Progress bar update
audio.addEventListener("timeupdate", () => {
  progress.value = (audio.currentTime / audio.duration) * 100 || 0;
  currentTimeEl.textContent = formatTime(audio.currentTime);
  durationEl.textContent = formatTime(audio.duration);
});

// Seek
progress.addEventListener("input", () => {
  audio.currentTime = (progress.value / 100) * audio.duration;
});

// Ended behavior
audio.addEventListener("ended", () => {
  if (isRepeat) {
    audio.currentTime = 0;
    audio.play();
  } else if (isShuffle) {
    currentIndex = Math.floor(Math.random() * playlist.length);
    loadSong(currentIndex);
  } else {
    nextBtn.click();
  }
});

// File input
fileInput.addEventListener("change", (e) => {
  playlist = Array.from(e.target.files);
  displayPlaylist();
  currentIndex = 0;
  loadSong(currentIndex);
});
