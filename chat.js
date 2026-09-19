// ════════════════════════════════════════════════════════════
// 💬 CHAT GRUPAL — texto + emojis, se limpia al cerrar sesión
// ════════════════════════════════════════════════════════════
// Nota honesta: "se borra al salir de la página" solo se garantiza
// al 100% si el usuario usa el botón de "Cerrar sesión". Si cierra
// la pestaña de golpe, el evento beforeunload intenta limpiar, pero
// los navegadores no siempre le dan tiempo a terminar esa petición.
// Por eso el admin puede además vaciar el chat manualmente si algo
// se queda pegado.

let unsubscribeChat = null;

function iniciarEscuchaChat() {
  unsubscribeChat = db.collection("chat").orderBy("fecha", "asc")
    .onSnapshot((snap) => {
      const cont = $("#mensajes-chat");
      cont.innerHTML = "";
      snap.forEach((doc) => {
        const m = doc.data();
        const div = document.createElement("div");
        div.className = "mensaje-chat" + (m.uid === usuarioActual.uid ? " propio" : "");
        div.innerHTML = `<span class="chat-autor">${m.nombre}</span><span class="chat-texto"></span>`;
        div.querySelector(".chat-texto").textContent = m.texto; // textContent evita inyección de HTML
        cont.appendChild(div);
      });
      cont.scrollTop = cont.scrollHeight;
    });
}

$("#form-chat").addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = $("#input-chat");
  const texto = input.value.trim();
  if (!texto) return;
  input.value = "";
  await db.collection("chat").add({
    uid: usuarioActual.uid,
    nombre: usuarioActual.nombre,
    texto,
    fecha: firebase.firestore.FieldValue.serverTimestamp()
  });
});

// Selector de emojis simple
const EMOJIS_RAPIDOS = ["😀","😂","🥲","😎","🔥","🎶","🎧","❤️","👍","😢","🙌","✨"];
function pintarSelectorEmojis() {
  const cont = $("#selector-emojis");
  EMOJIS_RAPIDOS.forEach(em => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = em;
    b.className = "btn-emoji";
    b.onclick = () => { $("#input-chat").value += em; $("#input-chat").focus(); };
    cont.appendChild(b);
  });
}

async function limpiarChatDeSesion() {
  const snap = await db.collection("chat").get();
  const batch = db.batch();
  snap.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
}
