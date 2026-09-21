// ════════════════════════════════════════════════════════════
// 🚀 ARRANQUE DE LA APP
// ════════════════════════════════════════════════════════════

let _yaInicializado = false;

function onUsuarioListo() {
  document.title = "PASO-A-onUsuarioListo-INICIO";
  const dbg = document.getElementById("debug-canciones");
  if (dbg) dbg.textContent = "🔧 paso 1: onUsuarioListo() INICIÓ (yaInic=" + _yaInicializado + ")";

  if (_yaInicializado) { document.title = "PASO-B-yaInicializado-true-SALIO"; return; }
  _yaInicializado = true;

  document.title = "PASO-C-antes-de-suscribirseACanciones";
  if (dbg) dbg.textContent = "🔧 paso 2: a punto de llamar suscribirseACanciones()";
  suscribirseACanciones();
  document.title = "PASO-D-despues-de-suscribirseACanciones";
  iniciarEscuchaChat();
  suscribirseAAnchoDeBanda();
  pintarSelectorEmojis();
  document.title = "PASO-E-TODO-TERMINO-OK";
}

// Toggle entre formularios de login/registro
$("#link-ir-registro").addEventListener("click", (e) => {
  e.preventDefault();
  $("#form-login").hidden = true;
  $("#form-registro").hidden = false;
});
$("#link-ir-login").addEventListener("click", (e) => {
  e.preventDefault();
  $("#form-registro").hidden = true;
  $("#form-login").hidden = false;
});
