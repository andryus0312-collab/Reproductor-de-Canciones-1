// ════════════════════════════════════════════════════════════
// 📝 LETRAS — se guardan por canción (colección "letras", 1 doc
//    por cada id de canción), con estilos básicos guardados en HTML
// ════════════════════════════════════════════════════════════

async function cargarLetraDeCancion(cancionId) {
  const editor = $("#editor-letra");
  const visor = $("#visor-letra");
  $("#panel-letra-vacio").hidden = true;
  editor.hidden = true;
  visor.hidden = false;
  visor.innerHTML = "⏳ Cargando letra...";

  const doc = await db.collection("letras").doc(cancionId).get();
  if (doc.exists && doc.data().html) {
    visor.innerHTML = doc.data().html;
  } else {
    visor.innerHTML = `<p class="letra-vacia">🎤 Todavía no hay letra guardada para esta canción.</p>`;
  }
}

$("#btn-anadir-editar-letra").addEventListener("click", async () => {
  if (!cancionActual) return;
  const doc = await db.collection("letras").doc(cancionActual.id).get();
  const editor = $("#editor-letra");
  editor.innerHTML = doc.exists ? doc.data().html : "";
  editor.hidden = false;
  $("#visor-letra").hidden = true;
  $("#btn-anadir-editar-letra").hidden = true;
  $("#btn-guardar-letra").hidden = false;
  $("#btn-cancelar-letra").hidden = false;
  editor.focus();
});

// Barra de formato básica (usa execCommand — simple y suficiente para
// un editor de letras, aunque esté algo deprecado, funciona en todos
// los navegadores modernos para este caso de uso)
document.querySelectorAll("[data-formato]").forEach(btn => {
  btn.addEventListener("click", () => {
    const cmd = btn.dataset.formato;
    if (cmd === "fontSize") {
      document.execCommand("fontSize", false, btn.dataset.valor);
    } else if (cmd === "foreColor") {
      document.execCommand("foreColor", false, $("#selector-color-letra").value);
    } else {
      document.execCommand(cmd, false, null);
    }
    $("#editor-letra").focus();
  });
});

$("#selector-color-letra").addEventListener("input", (e) => {
  document.execCommand("foreColor", false, e.target.value);
});

$("#selector-tipografia-letra").addEventListener("change", (e) => {
  document.execCommand("fontName", false, e.target.value);
});

$("#btn-guardar-letra").addEventListener("click", async () => {
  if (!cancionActual) return;
  const html = $("#editor-letra").innerHTML;
  await db.collection("letras").doc(cancionActual.id).set({
    html,
    actualizadoPor: usuarioActual.nombre,
    fecha: firebase.firestore.FieldValue.serverTimestamp()
  });
  $("#editor-letra").hidden = true;
  $("#visor-letra").hidden = false;
  $("#visor-letra").innerHTML = html;
  $("#btn-guardar-letra").hidden = true;
  $("#btn-cancelar-letra").hidden = true;
  $("#btn-anadir-editar-letra").hidden = false;
});

$("#btn-cancelar-letra").addEventListener("click", () => {
  $("#editor-letra").hidden = true;
  $("#visor-letra").hidden = false;
  $("#btn-guardar-letra").hidden = true;
  $("#btn-cancelar-letra").hidden = true;
  $("#btn-anadir-editar-letra").hidden = false;
});

// Nota: en esta v1 la letra se muestra COMPLETA mientras suena la
// canción (según lo pedido) — no hay resaltado línea por línea
// sincronizado con el tiempo. Dejamos el "gancho" aquí por si en el
// futuro se quiere agregar karaoke real.
function sincronizarLetraConTiempo(tiempoActual, duracion) {
  // Intencionalmente vacío en la v1.
}
