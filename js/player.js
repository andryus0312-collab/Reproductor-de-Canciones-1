// ════════════════════════════════════════════════════════════
// 🎧 REPRODUCTOR — audio + cambio de skin
// ════════════════════════════════════════════════════════════

const audio = new Audio();
let skinActual = localStorage.getItem("skin") || "winamp";
let bytesReproducidosSesion = 0;

function aplicarSkin(skin) {
  skinActual = skin;
  localStorage.setItem("skin", skin);
  document.body.setAttribute("data-skin", skin);
  document.querySelectorAll(".btn-skin").forEach(b => {
    b.classList.toggle("activo", b.dataset.skin === skin);
  });
}

document.querySelectorAll(".btn-skin").forEach(btn => {
  btn.addEventListener("click", () => aplicarSkin(btn.dataset.skin));
});

function cargarCancionEnPlayer(cancion) {
  audio.src = cancion.url;
  audio.play();
  $("#player-titulo").textContent = cancion.nombre;
  $("#player-subtitulo").textContent = "⬆️ " + cancion.subidoPor;
  $("#btn-play-pause").textContent = "⏸";
}

$("#btn-play-pause").addEventListener("click", () => {
  if (!audio.src) return;
  if (audio.paused) { audio.play(); $("#btn-play-pause").textContent = "⏸"; }
  else { audio.pause(); $("#btn-play-pause").textContent = "▶"; }
});

$("#barra-progreso").addEventListener("input", (e) => {
  if (!audio.duration) return;
  audio.currentTime = (e.target.value / 100) * audio.duration;
});

audio.addEventListener("timeupdate", () => {
  if (!audio.duration) return;
  $("#barra-progreso").value = (audio.currentTime / audio.duration) * 100;
  $("#tiempo-actual").textContent = formatoTiempo(audio.currentTime);
  $("#tiempo-total").textContent = formatoTiempo(audio.duration);
  sincronizarLetraConTiempo(audio.currentTime, audio.duration);
});

audio.addEventListener("ended", () => {
  $("#btn-play-pause").textContent = "▶";
});

// Contabilizamos (una sola vez por canción reproducida) el "costo" de
// escucharla, para el contador de ancho de banda estimado.
audio.addEventListener("play", () => {
  if (cancionActual && !cancionActual._contadaEnEstaSesion) {
    cancionActual._contadaEnEstaSesion = true;
    registrarUsoAncho(cancionActual.tamanoBytes, "reproducción");
  }
});

$("#control-volumen").addEventListener("input", (e) => {
  audio.volume = e.target.value / 100;
});

function formatoTiempo(seg) {
  if (isNaN(seg)) return "0:00";
  const m = Math.floor(seg / 60);
  const s = Math.floor(seg % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// Inicializa skin guardada al cargar
aplicarSkin(skinActual);
