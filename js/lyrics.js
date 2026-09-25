// ════════════════════════════════════════════════════════════
// 📝 LETRAS — se guardan por canción (colección "letras", 1 doc
//    por cada id de canción), con estilos básicos guardados en HTML
// ════════════════════════════════════════════════════════════

async function cargarLetraDeCancion(cancionId) {
  const editor = $("#editor-letra");
  const visor = $("#visor-letra");
  const panelVacio = $("#panel-letra-vacio");
  
  if (panelVacio) panelVacio.hidden = true;
  editor.hidden = true;
  visor.hidden = false;
  visor.innerHTML = "⏳ Cargando letra...";

  // CORRECCIÓN 1: Restaurar estado de botones al cambiar de canción
  const btnEditar = $("#btn-anadir-editar-letra");
  const btnGuardar = $("#btn-guardar-letra");
  const btnCancelar = $("#btn-cancelar-letra");
  if (btnEditar) btnEditar.hidden = false;
  if (btnGuardar) btnGuardar.hidden = true;
  if (btnCancelar) btnCancelar.hidden = true;

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
  
  // CORRECCIÓN 1: Mostrar guardar/cancelar, ocultar editar
  $("#btn-guardar-letra").hidden = false;
  $("#btn-cancelar-letra").hidden = false;
  $("#btn-anadir-editar-letra").hidden = true;
  
  editor.focus();
});

// Barra de formato básica
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
  
  // Guarda EXCLUSIVAMENTE para la canción actual (cancionActual.id)
  await db.collection("letras").doc(cancionActual.id).set({
    html,
    actualizadoPor: usuarioActual.nombre,
    fecha: firebase.firestore.FieldValue.serverTimestamp()
  });
  
  $("#editor-letra").hidden = true;
  $("#visor-letra").hidden = false;
  $("#visor-letra").innerHTML = html;
  
  // CORRECCIÓN 1: Restaurar botones tras guardar
  $("#btn-guardar-letra").hidden = true;
  $("#btn-cancelar-letra").hidden = true;
  $("#btn-anadir-editar-letra").hidden = false;
});

$("#btn-cancelar-letra").addEventListener("click", () => {
  $("#editor-letra").hidden = true;
  $("#visor-letra").hidden = false;
  
  // CORRECCIÓN 1: Restaurar botones tras cancelar
  $("#btn-guardar-letra").hidden = true;
  $("#btn-cancelar-letra").hidden = true;
  $("#btn-anadir-editar-letra").hidden = false;
});

function sincronizarLetraConTiempo(tiempoActual, duracion) {
  // Intencionalmente vacío en la v1.
}
