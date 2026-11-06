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

const PRESETS_EQ = {
  plano: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  rock: [5, 4, 3, 1, -1, -1, 2, 3, 4, 5],
  pop: [-1, 1, 3, 4, 2, -1, 0, 2, 3, 2],
  clasica: [4, 3, 2, 1, -1, -1, 0, 2, 3, 4],
  jazz: [3, 2, 1, 2, -2, -2, 0, 1, 2, 3],
  voz: [-3, -2, 0, 3, 5, 5, 3, 1, 0, -1],
  bajos: [8, 7, 5, 2, 0, -1, -2, -2, -1, 0]
};
const GRUPOS_EQ_SONY = [[0, 1], [2, 3], [4, 5], [6, 7], [8, 9]];

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
  document.body.classList.remove("portable-eq-open", "sony-eq-open");
  document.getElementById("sony-eq-screen")?.setAttribute("hidden", "");
  document.querySelector(".pantalla-player")?.classList.remove("sony-eq-active");
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

function actualizarBotonesEstadoEQ() {
  const botonGeneral = document.getElementById("btn-toggle-eq");
  const botonSony = document.getElementById("sony-eq-power");
  if (botonGeneral) {
    botonGeneral.textContent = ecualizadorActivado ? "✓ Ecualizador encendido" : "○ Ecualizador apagado";
    botonGeneral.setAttribute("aria-pressed", String(ecualizadorActivado));
  }
  if (botonSony) {
    botonSony.textContent = ecualizadorActivado ? "EQ ON" : "EQ OFF";
    botonSony.setAttribute("aria-pressed", String(ecualizadorActivado));
  }
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
  const lienzos = ["visualizador-xp", "visualizador-portatil"]
    .map(id => document.getElementById(id))
    .filter(Boolean)
    .map(canvas => ({ canvas, ctx: canvas.getContext("2d") }))
    .filter(item => item.ctx);
  if (!lienzos.length || !analizadorAudio || animacionVisualizador !== null) return;
  const datos = new Uint8Array(analizadorAudio.frequencyBinCount);

  const dibujar = () => {
    if (audio.paused || audio.ended) {
      animacionVisualizador = null;
      lienzos.forEach(({ canvas, ctx }) => ctx.clearRect(0, 0, canvas.width, canvas.height));
      return;
    }
    analizadorAudio.getByteFrequencyData(datos);
    lienzos.forEach(({ canvas, ctx }) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barras = canvas.id === "visualizador-portatil" ? 32 : 48;
      const separacion = canvas.id === "visualizador-portatil" ? 2 : 2;
      const ancho = (canvas.width - (barras - 1) * separacion) / barras;
      for (let i = 0; i < barras; i++) {
        const indice = Math.floor(i * datos.length / barras);
        const altura = Math.max(2, (datos[indice] / 255) * (canvas.height - 4));
        const x = i * (ancho + separacion);
        const gradiente = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - altura);
        if (canvas.id === "visualizador-portatil") {
          gradiente.addColorStop(0, skinActual === "sonyericsson" ? "#b84e08" : "#526f55");
          gradiente.addColorStop(0.6, skinActual === "sonyericsson" ? "#f28a18" : "#91ad83");
          gradiente.addColorStop(1, skinActual === "sonyericsson" ? "#ffd078" : "#d7e8c8");
        } else {
          gradiente.addColorStop(0, "#13a65b");
          gradiente.addColorStop(0.55, "#a8d832");
          gradiente.addColorStop(1, "#e5f66b");
        }
        ctx.fillStyle = gradiente;
        ctx.fillRect(x, canvas.height - altura, ancho, altura);
      }
    });
    animacionVisualizador = requestAnimationFrame(dibujar);
  };
  animacionVisualizador = requestAnimationFrame(dibujar);
}

function detenerVisualizador() {
  if (animacionVisualizador !== null) {
    cancelAnimationFrame(animacionVisualizador);
    animacionVisualizador = null;
  }
  ["visualizador-xp", "visualizador-portatil"].forEach(id => {
    const canvas = document.getElementById(id);
    if (canvas) canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
  });
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

function actualizarEstadoPortatil(mensaje) {
  const estado = document.getElementById("portable-playback-status");
  if (estado) estado.textContent = mensaje;
}

function actualizarControlesRetro(reproduciendo) {
  const icono = reproduciendo ? "⏸" : "▶";
  actualizarEstadoPortatil(reproduciendo ? "PLAYING" : "PAUSED");
  const etiqueta = reproduciendo ? "Pausar" : "Reproducir";
  ["ipod-play", "sony-play"].forEach(id => {
    const boton = document.getElementById(id);
    if (boton) {
      boton.textContent = icono;
      boton.setAttribute("aria-label", etiqueta);
      boton.title = etiqueta;
    }
  });
}

function cambiarCancionPorIndice(desplazamiento) {
  const canciones = typeof cacheCanciones !== "undefined" ? cacheCanciones : [];
  if (!canciones.length || typeof seleccionarCancion !== "function") {
    actualizarEstadoEQ("Primero carga canciones en tu biblioteca.");
    return;
  }
  const actual = typeof cancionActual !== "undefined" ? cancionActual : null;
  const indiceActual = canciones.findIndex(c => c.id === actual?.id);
  const base = indiceActual < 0 ? 0 : indiceActual;
  const siguiente = indiceActual < 0 && desplazamiento < 0
    ? canciones.length - 1
    : (base + desplazamiento + canciones.length) % canciones.length;
  seleccionarCancion(canciones[siguiente].id);
}

function ajustarVolumenRetro(cambio) {
  const control = document.getElementById("control-volumen");
  if (!control) return;
  const nuevo = Math.max(0, Math.min(100, Number(control.value) + cambio));
  control.value = String(nuevo);
  audio.volume = nuevo / 100;
  const porcentaje = document.querySelector(".xp-volumen-porcentaje");
  if (porcentaje) porcentaje.textContent = nuevo + "%";
  const portable = document.getElementById("portable-volume");
  if (portable) portable.textContent = "VOL " + nuevo + "%";
}

function alternarEcualizadorDesdeSkin() {
  const vista = document.getElementById("sony-eq-screen");
  const pantalla = document.querySelector(".pantalla-player");
  const abrir = vista?.hidden ?? true;
  if (!vista || !pantalla) return;
  vista.hidden = !abrir;
  pantalla.classList.toggle("sony-eq-active", abrir);
  document.body.classList.toggle("sony-eq-open", abrir);
  if (abrir) sincronizarControlesSonyEQ();
}

function sincronizarControlesSonyEQ() {
  document.querySelectorAll("[data-sony-eq]").forEach(control => {
    const grupo = GRUPOS_EQ_SONY[Number(control.dataset.sonyEq)];
    const promedio = Math.round(grupo.reduce((total, indice) => total + valoresEQ[indice], 0) / grupo.length);
    control.value = String(promedio);
    const salida = control.parentElement?.querySelector("output");
    if (salida) salida.textContent = (promedio > 0 ? "+" : "") + promedio;
  });
  const selectorSony = document.getElementById("sony-eq-preset");
  const selectorGeneral = document.getElementById("selector-presets-eq");
  if (selectorSony && selectorGeneral) selectorSony.value = selectorGeneral.value;
}

function abrirMenuIpod() {
  const menu = document.getElementById("ipod-menu-panel");
  if (menu) menu.hidden = !menu.hidden;
}

function ejecutarAccionMenuIpod(accion) {
  const menu = document.getElementById("ipod-menu-panel");
  if (menu) menu.hidden = true;
  const destinos = {
    library: document.getElementById("lista-canciones"),
    now: document.querySelector(".carcasa-player"),
    equalizer: document.getElementById("panel-ecualizador")
  };
  if (accion === "equalizer") {
    const estabaAbierto = document.body.classList.contains("portable-eq-open");
    document.body.classList.toggle("portable-eq-open", !estabaAbierto);
    if (!estabaAbierto) destinos[accion]?.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
  destinos[accion]?.scrollIntoView({ behavior: "smooth", block: "center" });
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

// Controles físicos simulados de iPod Classic y Sony Ericsson Walkman.
document.getElementById("ipod-menu")?.addEventListener("click", abrirMenuIpod);
document.getElementById("ipod-prev")?.addEventListener("click", () => cambiarCancionPorIndice(-1));
document.getElementById("ipod-next")?.addEventListener("click", () => cambiarCancionPorIndice(1));
document.getElementById("ipod-play")?.addEventListener("click", () => botonPlay.click());
document.getElementById("ipod-select")?.addEventListener("click", () => {
  const menu = document.getElementById("ipod-menu-panel");
  if (menu && !menu.hidden) ejecutarAccionMenuIpod("library");
  else document.getElementById("player-titulo")?.scrollIntoView({ behavior: "smooth", block: "center" });
});

// El gesto vertical sobre el anillo libre del Click Wheel ajusta el volumen.
const ruedaIpod = document.getElementById("ipod-wheel");
let posicionAnteriorRueda = null;
ruedaIpod?.addEventListener("pointerdown", (evento) => {
  if (evento.target.closest("button")) return;
  posicionAnteriorRueda = evento.clientY;
  ruedaIpod.setPointerCapture?.(evento.pointerId);
});
ruedaIpod?.addEventListener("pointermove", (evento) => {
  if (posicionAnteriorRueda === null) return;
  const diferencia = posicionAnteriorRueda - evento.clientY;
  if (Math.abs(diferencia) >= 12) {
    ajustarVolumenRetro(diferencia > 0 ? 5 : -5);
    posicionAnteriorRueda = evento.clientY;
  }
});
["pointerup", "pointercancel", "lostpointercapture"].forEach(tipo => {
  ruedaIpod?.addEventListener(tipo, () => { posicionAnteriorRueda = null; });
});

document.querySelectorAll("[data-ipod-menu]").forEach(boton => {
  boton.addEventListener("click", () => ejecutarAccionMenuIpod(boton.dataset.ipodMenu));
});

document.getElementById("sony-soft-left")?.addEventListener("click", () => cambiarCancionPorIndice(-1));
document.getElementById("sony-soft-right")?.addEventListener("click", () => cambiarCancionPorIndice(1));
document.getElementById("sony-prev")?.addEventListener("click", () => cambiarCancionPorIndice(-1));
document.getElementById("sony-next")?.addEventListener("click", () => cambiarCancionPorIndice(1));
document.getElementById("sony-play")?.addEventListener("click", () => botonPlay.click());
document.getElementById("sony-volume-up")?.addEventListener("click", () => ajustarVolumenRetro(5));
document.getElementById("sony-volume-down")?.addEventListener("click", () => ajustarVolumenRetro(-5));
document.getElementById("sony-walkman-toggle")?.addEventListener("click", alternarEcualizadorDesdeSkin);

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
  actualizarControlesRetro(true);
  iniciarVisualizador();
  if (cancionActual && !cancionActual._contadaEnEstaSesion) {
    cancionActual._contadaEnEstaSesion = true;
    registrarUsoAncho(cancionActual.tamanoBytes, "reproducción");
  }
});

audio.addEventListener("pause", () => {
  botonPlay.textContent = "▶";
  actualizarControlesRetro(false);
  detenerVisualizador();
});

audio.addEventListener("ended", () => {
  botonPlay.textContent = "▶";
  actualizarControlesRetro(false);
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
actualizarControlesRetro(false);
const volumenInicial = document.querySelector(".xp-volumen-porcentaje");
if (volumenInicial) volumenInicial.textContent = document.getElementById("control-volumen").value + "%";
const volumenPortatilInicial = document.getElementById("portable-volume");
if (volumenPortatilInicial) volumenPortatilInicial.textContent = "VOL " + document.getElementById("control-volumen").value + "%";

// Controles del ecualizador de 10 bandas.
document.querySelectorAll(".control-banda-eq").forEach(control => {
  control.addEventListener("input", () => {
    const indice = Number(control.dataset.indice);
    valoresEQ[indice] = Number(control.value);
    const lectura = document.querySelector(`[data-lectura-eq="${indice}"]`);
    if (lectura) lectura.textContent = (valoresEQ[indice] > 0 ? "+" : "") + valoresEQ[indice] + " dB";
    if (!ecualizadorDisponible) inicializarAudioGraph();
    aplicarValoresEQ();
    sincronizarControlesSonyEQ();
  });
});

document.getElementById("selector-presets-eq")?.addEventListener("change", (e) => {
  valoresEQ = [...(PRESETS_EQ[e.target.value] || PRESETS_EQ.plano)];
  document.querySelectorAll(".control-banda-eq").forEach(control => {
    const indice = Number(control.dataset.indice);
    control.value = valoresEQ[indice];
    const lectura = document.querySelector(`[data-lectura-eq="${indice}"]`);
    if (lectura) lectura.textContent = (valoresEQ[indice] > 0 ? "+" : "") + valoresEQ[indice] + " dB";
  });
  if (!ecualizadorDisponible) inicializarAudioGraph();
  aplicarValoresEQ();
  sincronizarControlesSonyEQ();
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
  sincronizarControlesSonyEQ();
});


document.querySelectorAll("[data-sony-eq]").forEach(control => {
  control.addEventListener("input", () => {
    const valor = Number(control.value);
    const grupo = GRUPOS_EQ_SONY[Number(control.dataset.sonyEq)];
    grupo.forEach(indice => {
      valoresEQ[indice] = valor;
      const original = document.querySelector(`.control-banda-eq[data-indice="${indice}"]`);
      const lectura = document.querySelector(`[data-lectura-eq="${indice}"]`);
      if (original) original.value = String(valor);
      if (lectura) lectura.textContent = (valor > 0 ? "+" : "") + valor + " dB";
    });
    const salida = control.parentElement?.querySelector("output");
    if (salida) salida.textContent = (valor > 0 ? "+" : "") + valor;
    const general = document.getElementById("selector-presets-eq");
    const sony = document.getElementById("sony-eq-preset");
    if (general) general.value = "plano";
    if (sony) sony.value = "plano";
    if (!ecualizadorDisponible) inicializarAudioGraph();
    aplicarValoresEQ();
  });
});

document.getElementById("sony-eq-preset")?.addEventListener("change", evento => {
  valoresEQ = [...(PRESETS_EQ[evento.target.value] || PRESETS_EQ.plano)];
  document.querySelectorAll(".control-banda-eq").forEach(control => {
    const indice = Number(control.dataset.indice);
    control.value = String(valoresEQ[indice]);
    const lectura = document.querySelector(`[data-lectura-eq="${indice}"]`);
    if (lectura) lectura.textContent = (valoresEQ[indice] > 0 ? "+" : "") + valoresEQ[indice] + " dB";
  });
  const general = document.getElementById("selector-presets-eq");
  if (general) general.value = evento.target.value;
  sincronizarControlesSonyEQ();
  if (!ecualizadorDisponible) inicializarAudioGraph();
  aplicarValoresEQ();
});

document.getElementById("sony-eq-back")?.addEventListener("click", alternarEcualizadorDesdeSkin);
document.getElementById("sony-eq-power")?.addEventListener("click", evento => {
  ecualizadorActivado = !ecualizadorActivado;
  aplicarValoresEQ();
  actualizarBotonesEstadoEQ();
});

document.getElementById("btn-toggle-eq")?.addEventListener("click", () => {
  ecualizadorActivado = !ecualizadorActivado;
  aplicarValoresEQ();
  actualizarBotonesEstadoEQ();
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
