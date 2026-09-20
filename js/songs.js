// ════════════════════════════════════════════════════════════
// 🎵 CANCIONES — subir (máx 5 a la vez, 10MB c/u), listar,
//    filtrar, calificar con estrellas, identificar quién subió qué
// ════════════════════════════════════════════════════════════

let cancionActual = null; // { id, nombre, ...}
let cacheCanciones = [];

function sanitizarNombreArchivo(nombre) {
  return nombre
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // quita tildes
    .replace(/[^a-zA-Z0-9._-]/g, "_"); // reemplaza todo lo raro por "_"
}
$("#input-subir-canciones").addEventListener("change", async (e) => {
  const archivos = Array.from(e.target.files);
  const estadoEl = $("#estado-subida");

  if (archivos.length > MAX_SUBIDA_LOTE) {
    estadoEl.textContent = `⚠️ Máximo ${MAX_SUBIDA_LOTE} canciones por lote. Elegiste ${archivos.length}.`;
    e.target.value = "";
    return;
  }

  const sobrepasan = archivos.filter(f => f.size > LIMITE_CANCION_BYTES);
  if (sobrepasan.length > 0) {
    estadoEl.textContent = `🚫 "${sobrepasan[0].name}" pesa ${(sobrepasan[0].size / 1024 / 1024).toFixed(1)}MB. El límite es 10MB por canción.`;
    e.target.value = "";
    return;
  }

  estadoEl.textContent = `⏳ Subiendo ${archivos.length} canción(es)...`;

  let errores = [];

  for (const archivo of archivos) {
    let rutaStorage;
    try {
      rutaStorage = `${usuarioActual.uid}_${Date.now()}_${sanitizarNombreArchivo(archivo.name)}`;

      const { error: errorSubida } = await supabaseClient.storage
        .from(NOMBRE_BUCKET)
        .upload(rutaStorage, archivo, { contentType: archivo.type });

      if (errorSubida) throw errorSubida;

      const { data: urlData } = supabaseClient.storage
        .from(NOMBRE_BUCKET)
        .getPublicUrl(rutaStorage);
      const url = urlData.publicUrl;

      await db.collection("canciones").add({
        nombre: archivo.name.replace(/\.[^/.]+$/, ""),
        rutaStorage,
        url,
        tamanoBytes: archivo.size,
        subidoPor: usuarioActual.nombre,
        subidoPorUid: usuarioActual.uid,
        fecha: firebase.firestore.FieldValue.serverTimestamp(),
        calificacion: 0,
        calificaciones: {}
      });

      await registrarUsoAncho(archivo.size, "subida");
    } catch (err) {
      console.error("Error subiendo", archivo.name, "ruta:", rutaStorage, err);
      errores.push(`${archivo.name} [ruta: ${rutaStorage}]: ${err.message || err}`);
    }
  }

  if (errores.length === 0) {
    estadoEl.textContent = `✅ ¡Listo! Se subieron ${archivos.length} canción(es).`;
  } else {
    estadoEl.textContent = `❌ Falló: ${errores.join(" | ")}`;
  }
  e.target.value = "";
});

function suscribirseACanciones() {
  db.collection("canciones").orderBy("fecha", "desc").onSnapshot(
    (snap) => {
      cacheCanciones = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const dbg = document.getElementById("debug-canciones");
      if (dbg) dbg.textContent = `🔧 debug: llegaron ${snap.size} documento(s) de Firestore`;
      renderizarListaCanciones();
    },
    (err) => {
      console.error("Error leyendo canciones:", err);
      const dbg = document.getElementById("debug-canciones");
      if (dbg) dbg.textContent = "🔧 debug: ERROR AL LEER - " + err.message;
      $("#estado-subida").textContent = "❌ No se pudo cargar la lista de canciones: " + err.message;
    }
  );
}

function renderizarListaCanciones() {
  const cont = $("#lista-canciones");
  const filtroTexto = $("#filtro-nombre").value.toLowerCase();
  const orden = $("#filtro-orden").value;

  let items = cacheCanciones.filter(c => c.nombre.toLowerCase().includes(filtroTexto));

  if (orden === "nombre") items.sort((a, b) => a.nombre.localeCompare(b.nombre));
  else if (orden === "tamano") items.sort((a, b) => b.tamanoBytes - a.tamanoBytes);
  else if (orden === "calificacion") items.sort((a, b) => promedioEstrellas(b) - promedioEstrellas(a));
  else items.sort((a, b) => (b.fecha?.seconds || 0) - (a.fecha?.seconds || 0));

  cont.innerHTML = "";
  items.forEach((c) => {
    const li = document.createElement("li");
    li.className = "item-cancion" + (cancionActual?.id === c.id ? " activa" : "");
    const prom = promedioEstrellas(c);

    li.innerHTML = `
      <div class="cancion-info" data-id="${c.id}">
        <span class="cancion-nombre">${c.nombre}</span>
        <span class="cancion-meta">⬆️ ${c.subidoPor} · ${(c.tamanoBytes / 1024 / 1024).toFixed(1)}MB</span>
        <span class="cancion-estrellas" data-id="${c.id}">${dibujarEstrellas(prom)}</span>
      </div>
      ${(c.subidoPorUid === usuarioActual.uid || usuarioActual.esAdmin)
        ? `<button class="btn-mini-peligro" data-eliminar="${c.id}">🗑️</button>` : ""}
    `;
    cont.appendChild(li);
  });

  cont.querySelectorAll(".cancion-info").forEach(el => {
    el.addEventListener("click", () => seleccionarCancion(el.dataset.id));
  });
  cont.querySelectorAll("[data-eliminar]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      eliminarCancion(btn.dataset.eliminar);
    });
  });
}

$("#filtro-nombre").addEventListener("input", renderizarListaCanciones);
$("#filtro-orden").addEventListener("change", renderizarListaCanciones);

function promedioEstrellas(c) {
  const vals = Object.values(c.calificaciones || {});
  if (vals.length === 0) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function dibujarEstrellas(prom) {
  const llenas = Math.round(prom);
  return "★".repeat(llenas) + "☆".repeat(5 - llenas);
}

async function calificarCancion(id, estrellas) {
  await db.collection("canciones").doc(id).update({
    [`calificaciones.${usuarioActual.uid}`]: estrellas
  });
}

async function eliminarCancion(id) {
  const c = cacheCanciones.find(x => x.id === id);
  if (!c) return;
  if (!confirm(`¿Eliminar "${c.nombre}"? Esto no se puede deshacer.`)) return;
  try {
    await supabaseClient.storage.from(NOMBRE_BUCKET).remove([c.rutaStorage]);
  } catch (e) { /* si ya no existe el archivo, seguimos igual */ }
  await db.collection("canciones").doc(id).delete();
  await db.collection("letras").doc(id).delete().catch(() => {});
}

function seleccionarCancion(id) {
  const c = cacheCanciones.find(x => x.id === id);
  if (!c) return;
  cancionActual = c;
  cargarCancionEnPlayer(c);
  cargarLetraDeCancion(c.id);
  renderizarListaCanciones();
  mostrarSelectorEstrellasEnDetalle(c);
}

function mostrarSelectorEstrellasEnDetalle(c) {
  const cont = $("#calificar-actual");
  cont.innerHTML = "";
  const miCalif = c.calificaciones?.[usuarioActual.uid] || 0;
  for (let i = 1; i <= 5; i++) {
    const s = document.createElement("span");
    s.textContent = i <= miCalif ? "★" : "☆";
    s.className = "estrella-clicable";
    s.onclick = () => calificarCancion(c.id, i);
    cont.appendChild(s);
  }
}
