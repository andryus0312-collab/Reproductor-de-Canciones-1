// ════════════════════════════════════════════════════════════
// 🎧 REPRODUCTOR RETRO — motor nativo + skins + ecualizador
// El elemento HTMLAudioElement original se conserva. Web Audio
// se conecta una sola vez y únicamente cuando el usuario inicia
// una reproducción, para respetar las políticas de autoplay.
// ════════════════════════════════════════════════════════════

const audio = new Audio();
let skinActual = localStorage.getItem("skin") || "windows-xp";
let bytesReproducidosSesion = 0;

// Motor de procesamiento (se inicializa de forma diferida).
let contextoAudio = null;
let fuenteAudio = null;
let filtrosEQ = [];
let analizadorAudio = null;
let ecualizadorDisponible = false;
let ecualizadorActivado = true;
let valoresEQ = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
let animacionVisualizador = null;

const BANDAS_EQ = [
  { frecuencia: 31, tipo: "lowshelf" },
  { frecuencia: 62, tipo: "peaking" },
  { frecuencia: 125, tipo: "peaking" },
  { frecuencia: 250, tipo: "peaking" },
  { frecuencia: 500, tipo: "peaking" },
  { frecuencia: 1000, tipo: "peaking" },
  { frecuencia: 2000, tipo: "peaking" },
  { frecuencia: 4000, tipo: "peaking" },
  { frecuencia: 8000, tipo: "peaking" },
  { frecuencia: 16000, tipo: "highshelf" }
];

function aplicarSkin(skin) {
  const skinsPermitidos = ["windows-xp", "winamp", "ipod", "sonyericsson"];
  skinActual = skinsPermitidos.includes(skin) ? skin : "windows-xp";
  localStorage.setItem("skin", skinActual);
  document.body.setAttribute("data-skin", skinActual);
  document.querySelectorAll(".btn-skin").forEach(b => {
    b.classList.toggle("activo", b.dataset.skin === skinActual);
    b.setAttribute("aria-pressed", b.dataset.skin === skinActual ? "true" : "false");
  });
}

document.querySelectorAll(".btn-skin").forEach(btn => {
  btn.addEventListener("click", () => aplicarSkin(btn.dataset.skin));
});

function actualizarEstadoEQ(mensaje) {
  const estado = document.getElementById("estado-ecualizador");
  if (estado) estado.textContent = mensaje;
}

function inicializarAudioGraph() {
  if (ecualizadorDisponible) return true;

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    actualizarEstadoEQ("Tu navegador no admite Web Audio. La reproducción normal sigue disponible.");
    return false;
  }

  try {
    // Debe establecerse antes de asignar la URL remota.
    audio.crossOrigin = "anonymous";
    contextoAudio = new AudioContextClass();
    fuenteAudio = contextoAudio.createMediaElementSource(audio);
    filtrosEQ = BANDAS_EQ.map(banda => {
      const filtro = contextoAudio.createBiquadFilter();
      filtro.type = banda.tipo;
      filtro.frequency.value = banda.frecuencia;
      filtro.Q.value = 1.1;
      return filtro;
    });
    analizadorAudio = contextoAudio.createAnalyser();
    analizadorAudio.fftSize = 256;
    analizadorAudio.smoothingTimeConstant = 0.82;

    fuenteAudio.connect(filtrosEQ[0]);
    for (let i = 0; i < filtrosEQ.length - 1; i++) {
      filtrosEQ[i].connect(filtrosEQ[i + 1]);
    }
    filtrosEQ[filtrosEQ.length - 1].connect(analizadorAudio);
    analizadorAudio.connect(contextoAudio.destination);
    ecualizadorDisponible = true;
    aplicarValoresEQ();
    actualizarEstadoEQ("Ecualizador activo · 10 bandas");
    return true;
  } catch (error) {
    console.error("No se pudo inicializar el ecualizador:", error);
    actualizarEstadoEQ("No fue posible activar el procesamiento de audio. Revisa la compatibilidad del navegador.");
    return false;
  }
}

function aplicarValoresEQ() {
  if (!ecualizadorDisponible) return;
  filtrosEQ.forEach((filtro, indice) => {
    filtro.gain.setTargetAtTime(
      ecualizadorActivado ? valoresEQ[indice] : 0,
      contextoAudio.currentTime,
      0.015
    );
  });
}

async function prepararAudioParaReproducir() {
  inicializarAudioGraph();
  if (contextoAudio && contextoAudio.state === "suspended") {
    try { await contextoAudio.resume(); }
    catch (error) { console.warn("No se pudo reanudar AudioContext:", error); }
  }
}

function iniciarVisualizador() {
  const canvas = document.getElementById("visualizador-xp");
  if (!canvas || !analizadorAudio || animacionVisualizador !== null) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const datos = new Uint8Array(analizadorAudio.frequencyBinCount);

  const dibujar = () => {
    if (audio.paused || audio.ended) {
      animacionVisualizador = null;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    analizadorAudio.getByteFrequencyData(datos);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const barras = 48;
    const separacion = 2;
    const ancho = (canvas.width - (barras - 1) * separacion) / barras;
    for (let i = 0; i < barras; i++) {
      const indice = Math.floor(i * datos.length / barras);
      const altura = Math.max(2, (datos[indice] / 255) * (canvas.height - 4));
      const x = i * (ancho + separacion);
      const gradiente = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - altura);
      gradiente.addColorStop(0, "#13a65b");
      gradiente.addColorStop(0.55, "#a8d832");
      gradiente.addColorStop(1, "#e5f66b");
      ctx.fillStyle = gradiente;
      ctx.fillRect(x, canvas.height - altura, ancho, altura);
    }
    animacionVisualizador = requestAnimationFrame(dibujar);
  };
  animacionVisualizador = requestAnimationFrame(dibujar);
}

function detenerVisualizador() {
  if (animacionVisualizador !== null) {
    cancelAnimationFrame(animacionVisualizador);
    animacionVisualizador = null;
  }
  const canvas = document.getElementById("visualizador-xp");
  if (canvas) canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
}

async function cargarCancionEnPlayer(cancion) {
  // Se configura el grafo antes de cambiar la fuente para evitar
  // crear más de un MediaElementAudioSourceNode para el mismo audio.
  await prepararAudioParaReproducir();
  audio.src = cancion.url;
  audio.load();
  actualizarDatosCancion(cancion);
  try {
    await audio.play();
  } catch (error) {
    // Algunos navegadores pueden bloquear el inicio automático.
    // La canción queda cargada y el usuario puede pulsar Reproducir.
    console.warn("El navegador bloqueó la reproducción automática:", error);
    document.getElementById("btn-play-pause").textContent = "▶";
  }
}

function actualizarDatosCancion(cancion) {
  const titulo = document.getElementById("player-titulo");
  const subtitulo = document.getElementById("player-subtitulo");
  if (titulo) titulo.textContent = cancion?.nombre || "Selecciona una canción ♪";
  if (subtitulo) subtitulo.textContent = cancion?.subidoPor ? "⬆️ " + cancion.subidoPor : "Biblioteca multimedia";
  const xpTitulo = document.getElementById("xp-titulo-cancion");
  if (xpTitulo) xpTitulo.textContent = cancion?.nombre || "No hay ninguna canción en reproducción";
  const xpArtista = document.getElementById("xp-artista-cancion");
  if (xpArtista) xpArtista.textContent = cancion?.subidoPor ? "Añadida por " + cancion.subidoPor : "Reproductor multimedia";
}

const botonPlay = document.getElementById("btn-play-pause");
botonPlay.addEventListener("click", async () => {
  if (!audio.src) return;
  if (audio.paused) {
    await prepararAudioParaReproducir();
    try { await audio.play(); }
    catch (error) { console.warn("No se pudo reproducir el audio:", error); }
  } else {
    audio.pause();
  }
});

document.getElementById("barra-progreso").addEventListener("input", (e) => {
  if (!audio.duration || !Number.isFinite(audio.duration)) return;
  audio.currentTime = (Number(e.target.value) / 100) * audio.duration;
});

audio.addEventListener("timeupdate", () => {
  if (!audio.duration || !Number.isFinite(audio.duration)) return;
  document.getElementById("barra-progreso").value = (audio.currentTime / audio.duration) * 100;
  document.getElementById("tiempo-actual").textContent = formatoTiempo(audio.currentTime);
  document.getElementById("tiempo-total").textContent = formatoTiempo(audio.duration);
  const xpTiempo = document.getElementById("xp-tiempo");
  if (xpTiempo) xpTiempo.textContent = formatoTiempo(audio.currentTime) + " / " + formatoTiempo(audio.duration);
  sincronizarLetraConTiempo(audio.currentTime, audio.duration);
});

audio.addEventListener("play", () => {
  botonPlay.textContent = "⏸";
  iniciarVisualizador();
  if (cancionActual && !cancionActual._contadaEnEstaSesion) {
    cancionActual._contadaEnEstaSesion = true;
    registrarUsoAncho(cancionActual.tamanoBytes, "reproducción");
  }
});

audio.addEventListener("pause", () => {
  botonPlay.textContent = "▶";
  detenerVisualizador();
});

audio.addEventListener("ended", () => {
  botonPlay.textContent = "▶";
  detenerVisualizador();
});

audio.addEventListener("error", () => {
  if (audio.error) {
    console.error("Error de audio:", audio.error.code, audio.error.message);
    actualizarEstadoEQ("Si el audio no carga, comprueba la URL pública y CORS del almacenamiento.");
  }
});

document.getElementById("control-volumen").addEventListener("input", (e) => {
  audio.volume = Number(e.target.value) / 100;
  const porcentaje = document.querySelector(".xp-volumen-porcentaje");
  if (porcentaje) porcentaje.textContent = e.target.value + "%";
});

// Volumen real alineado con el valor que muestra el control al iniciar.
audio.volume = Number(document.getElementById("control-volumen").value) / 100;
const volumenInicial = document.querySelector(".xp-volumen-porcentaje");
if (volumenInicial) volumenInicial.textContent = document.getElementById("control-volumen").value + "%";

// Controles del ecualizador de 10 bandas.
document.querySelectorAll(".control-banda-eq").forEach(control => {
  control.addEventListener("input", () => {
    const indice = Number(control.dataset.indice);
    valoresEQ[indice] = Number(control.value);
    const lectura = document.querySelector(`[data-lectura-eq="${indice}"]`);
    if (lectura) lectura.textContent = (valoresEQ[indice] > 0 ? "+" : "") + valoresEQ[indice] + " dB";
    if (!ecualizadorDisponible) inicializarAudioGraph();
    aplicarValoresEQ();
  });
});

document.getElementById("selector-presets-eq")?.addEventListener("change", (e) => {
  const presets = {
    plano: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    rock: [5, 4, 3, 1, -1, -1, 2, 3, 4, 5],
    pop: [-1, 1, 3, 4, 2, -1, 0, 2, 3, 2],
    clasica: [4, 3, 2, 1, -1, -1, 0, 2, 3, 4],
    jazz: [3, 2, 1, 2, -2, -2, 0, 1, 2, 3],
    voz: [-3, -2, 0, 3, 5, 5, 3, 1, 0, -1],
    bajos: [8, 7, 5, 2, 0, -1, -2, -2, -1, 0]
  };
  valoresEQ = [...(presets[e.target.value] || presets.plano)];
  document.querySelectorAll(".control-banda-eq").forEach(control => {
    const indice = Number(control.dataset.indice);
    control.value = valoresEQ[indice];
    const lectura = document.querySelector(`[data-lectura-eq="${indice}"]`);
    if (lectura) lectura.textContent = (valoresEQ[indice] > 0 ? "+" : "") + valoresEQ[indice] + " dB";
  });
  if (!ecualizadorDisponible) inicializarAudioGraph();
  aplicarValoresEQ();
});

document.getElementById("btn-reset-eq")?.addEventListener("click", () => {
  valoresEQ = Array(10).fill(0);
  document.querySelectorAll(".control-banda-eq").forEach(control => {
    control.value = 0;
    const lectura = document.querySelector(`[data-lectura-eq="${control.dataset.indice}"]`);
    if (lectura) lectura.textContent = "0 dB";
  });
  const selector = document.getElementById("selector-presets-eq");
  if (selector) selector.value = "plano";
  aplicarValoresEQ();
});

document.getElementById("btn-toggle-eq")?.addEventListener("click", () => {
  ecualizadorActivado = !ecualizadorActivado;
  aplicarValoresEQ();
  const boton = document.getElementById("btn-toggle-eq");
  boton.textContent = ecualizadorActivado ? "✓ Ecualizador encendido" : "○ Ecualizador apagado";
  boton.setAttribute("aria-pressed", String(ecualizadorActivado));
  actualizarEstadoEQ(ecualizadorActivado ? "Ecualizador activo · 10 bandas" : "Procesamiento desactivado · sonido original");
});

function formatoTiempo(seg) {
  if (isNaN(seg)) return "0:00";
  const m = Math.floor(seg / 60);
  const s = Math.floor(seg % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// Skin guardada. La preferencia es local a este navegador/dispositivo.
aplicarSkin(skinActual);
