// ════════════════════════════════════════════════════════════
// 🚀 ARRANQUE DE LA APP
// ════════════════════════════════════════════════════════════

let _yaInicializado = false;

function onUsuarioListo() {
  const dbg = document.getElementById("debug-canciones");
  if (dbg) dbg.textContent = "🔧 paso 1: onUsuarioListo() INICIÓ (yaInic=" + _yaInicializado + ")";

  if (_yaInicializado) return;
  _yaInicializado = true;

  if (dbg) dbg.textContent = "🔧 paso 2: a punto de llamar suscribirseACanciones()";
  suscribirseACanciones();
  iniciarEscuchaChat();
  suscribirseAAnchoDeBanda();
  pintarSelectorEmojis();
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
