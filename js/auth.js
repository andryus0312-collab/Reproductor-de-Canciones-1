// ════════════════════════════════════════════════════════════
// 🔐 AUTENTICACIÓN — registro libre, límite de 3 personas,
//    admin protegido (no se puede eliminar a sí mismo)
// ════════════════════════════════════════════════════════════

let usuarioActual = null; // { uid, email, nombre, esAdmin }

const $ = (sel) => document.querySelector(sel);

function mostrarAuthError(msg) {
  const el = $("#auth-error");
  el.textContent = msg;
  el.hidden = false;
}

function limpiarAuthError() {
  $("#auth-error").hidden = true;
}

// ── Registro ──────────────────────────────────────────────
$("#form-registro").addEventListener("submit", async (e) => {
  e.preventDefault();
  limpiarAuthError();

  const nombre = $("#registro-nombre").value.trim();
  const email = $("#registro-email").value.trim();
  const pass = $("#registro-pass").value;

  if (!nombre || !email || !pass) {
    mostrarAuthError("⚠️ Llena todos los campos, porfa.");
    return;
  }

  try {
    // 1) Contamos cuántos usuarios hay YA registrados en Firestore.
    //    (Esto es un control del lado del cliente — la barrera real
    //    y definitiva está en firestore.rules, que rechaza la
    //    creación del documento de usuario #4 en adelante.)
    const conteo = await db.collection("usuarios").get();
    if (conteo.size >= MAX_USUARIOS) {
      mostrarAuthError(
        `🚫 Ya somos ${MAX_USUARIOS} en esta casa. Si quieres entrar, ` +
        `pídele al admin que libere un cupo eliminando a alguien primero.`
      );
      return;
    }

    // 2) Creamos la cuenta en Firebase Auth
    const cred = await auth.createUserWithEmailAndPassword(email, pass);
    await cred.user.updateProfile({ displayName: nombre });

    // 3) Creamos su perfil en Firestore (esto es lo que las reglas
    //    de seguridad validan contra el límite de 3 y el admin)
    const esAdmin = email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
    await db.collection("usuarios").doc(cred.user.uid).set({
      nombre,
      email,
      esAdmin,
      creado: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (err) {
    mostrarAuthError("❌ " + traducirErrorFirebase(err));
  }
});

// ── Login ─────────────────────────────────────────────────
$("#form-login").addEventListener("submit", async (e) => {
  e.preventDefault();
  limpiarAuthError();
  const email = $("#login-email").value.trim();
  const pass = $("#login-pass").value;
  try {
    await auth.signInWithEmailAndPassword(email, pass);
  } catch (err) {
    mostrarAuthError("❌ " + traducirErrorFirebase(err));
  }
});

// ── Logout ────────────────────────────────────────────────
$("#btn-logout").addEventListener("click", async () => {
  // Al salir, limpiamos el chat efímero de esta sesión antes de cerrar sesión
  if (typeof limpiarChatDeSesion === "function") {
    await limpiarChatDeSesion();
  }
  await auth.signOut();
});

// Si el usuario cierra la pestaña/navegador sin darle "logout" explícito,
// intentamos limpiar igual (no es 100% garantizado por el navegador,
// pero cubre la mayoría de los casos).
window.addEventListener("beforeunload", () => {
  if (usuarioActual && typeof limpiarChatDeSesion === "function") {
    limpiarChatDeSesion();
  }
});

// ── Escucha de estado de sesión ──────────────────────────────
auth.onAuthStateChanged(async (user) => {
  const authView = $("#vista-auth");
  const appView = $("#vista-app");

  if (!user) {
    usuarioActual = null;
    authView.hidden = false;
    appView.hidden = true;
    return;
  }

  const perfilSnap = await db.collection("usuarios").doc(user.uid).get();
  const perfil = perfilSnap.exists ? perfilSnap.data() : { nombre: user.displayName, esAdmin: false };

  usuarioActual = {
    uid: user.uid,
    email: user.email,
    nombre: perfil.nombre || user.displayName || user.email,
    esAdmin: !!perfil.esAdmin
  };

  authView.hidden = true;
  appView.hidden = false;
  $("#usuario-nombre").textContent = usuarioActual.nombre + (usuarioActual.esAdmin ? " 👑" : "");
  $("#panel-admin").hidden = !usuarioActual.esAdmin;

  if (typeof onUsuarioListo === "function") onUsuarioListo();
});

// ── Panel de administrador: ver y eliminar usuarios ─────────
async function cargarListaUsuariosAdmin() {
  const cont = $("#lista-usuarios-admin");
  cont.innerHTML = "";
  const snap = await db.collection("usuarios").get();
  snap.forEach((doc) => {
    const u = doc.data();
    const li = document.createElement("li");
    li.textContent = `${u.nombre} (${u.email})${u.esAdmin ? " — 👑 admin" : ""}`;
    if (!u.esAdmin) {
      const btn = document.createElement("button");
      btn.textContent = "Eliminar 🗑️";
      btn.className = "btn-mini-peligro";
      btn.onclick = () => eliminarUsuario(doc.id, u.nombre);
      li.appendChild(btn);
    }
    cont.appendChild(li);
  });
}

async function eliminarUsuario(uid, nombre) {
  if (!confirm(`¿Seguro que quieres eliminar a ${nombre}? Esto libera un cupo, pero no borra sus canciones ya subidas.`)) return;
  // Nota honesta: desde el cliente solo podemos borrar el documento de
  // Firestore (libera el cupo para que otra persona se registre). Borrar
  // la cuenta de Auth de otra persona requiere privilegios de servidor
  // (Cloud Functions / Admin SDK), que no estamos usando en este plan
  // "sin Blaze". El documento borrado es lo que cuenta para el límite de 3.
  await db.collection("usuarios").doc(uid).delete();
  cargarListaUsuariosAdmin();
}

$("#btn-abrir-admin")?.addEventListener("click", () => {
  $("#modal-admin").hidden = false;
  cargarListaUsuariosAdmin();
});
$("#btn-cerrar-admin")?.addEventListener("click", () => {
  $("#modal-admin").hidden = true;
});

function traducirErrorFirebase(err) {
  const map = {
    "auth/email-already-in-use": "Ese correo ya tiene una cuenta.",
    "auth/invalid-email": "El correo no es válido.",
    "auth/weak-password": "La contraseña necesita mínimo 6 caracteres.",
    "auth/wrong-password": "Contraseña incorrecta.",
    "auth/user-not-found": "No hay cuenta con ese correo.",
    "auth/too-many-requests": "Demasiados intentos, espera un momento."
  };
  return map[err.code] || err.message;
}
