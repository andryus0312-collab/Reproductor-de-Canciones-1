// ════════════════════════════════════════════════════════════
// 📊 CONTADOR DE ANCHO DE BANDA (ESTIMADO PROPIO)
// ════════════════════════════════════════════════════════════
// Importante: esto NO es el dato oficial de Firebase. Es un
// registro que llevamos nosotros mismos (sube + reproducciones)
// para tener una idea de cuánto se ha usado del 1GB. Se reinicia
// manualmente cada mes por el admin si quieren llevar el control
// mensual.

async function registrarUsoAncho(bytes, tipo) {
  const ref = db.collection("meta").doc("ancho_de_banda");
  await db.runTransaction(async (t) => {
    const doc = await t.get(ref);
    const actual = doc.exists ? doc.data().totalBytes || 0 : 0;
    t.set(ref, { totalBytes: actual + bytes }, { merge: true });
  });
}

function suscribirseAAnchoDeBanda() {
  db.collection("meta").doc("ancho_de_banda").onSnapshot((doc) => {
    const bytes = doc.exists ? (doc.data().totalBytes || 0) : 0;
    const mb = (bytes / 1024 / 1024).toFixed(1);
    const porcentaje = Math.min(100, (bytes / (1024 * 1024 * 1024)) * 100).toFixed(1);
    $("#contador-ancho-banda").textContent =
      `📊 Uso estimado (nuestro, no el oficial de Firebase): ${mb} MB / 1024 MB (${porcentaje}%)`;
  });
}

$("#btn-reiniciar-ancho-banda")?.addEventListener("click", async () => {
  if (!usuarioActual.esAdmin) return;
  if (!confirm("¿Reiniciar el contador de ancho de banda a 0? (Solo afecta el número mostrado, no borra canciones)")) return;
  await db.collection("meta").doc("ancho_de_banda").set({ totalBytes: 0 });
});
