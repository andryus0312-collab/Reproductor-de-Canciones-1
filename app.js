// ════════════════════════════════════════════════════════════
// 🚀 ARRANQUE DE LA APP
// ════════════════════════════════════════════════════════════

let _yaInicializado = false;

function onUsuarioListo() {
  if (_yaInicializado) return; // evita duplicar listeners si vuelve a loguearse
  _yaInicializado = true;

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
