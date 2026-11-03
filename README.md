# 🎧 Reproductor Retro

Reproductor de música online con 4 skins (Windows Media Player XP, Winamp, iPod Classic y Sony Ericsson Walkman),
letras editables, calificación con estrellas, chat grupal efímero y
contador de ancho de banda — para 3 personas, con GitHub Pages + Firebase.

## 🚀 Puesta en marcha

> ⚠️ **Nota (2026):** Firebase Storage ahora exige el plan de pago Blaze
> sin excepción, así que los archivos de audio se guardan en **Supabase
> Storage** (gratis, sin tarjeta). Firebase sigue manejando el login,
> la base de datos, el chat y las letras.

### 1. Firebase (login + base de datos)
1. Ve a [console.firebase.google.com](https://console.firebase.google.com) y crea (o abre) tu proyecto.
2. **Authentication** → pestaña "Sign-in method" → activa **Correo/Contraseña**.
3. **Firestore Database** → crear base de datos (modo producción).
4. En **Configuración del proyecto → Tus apps → Web (`</>`)**, registra una app y copia el objeto `firebaseConfig`.
5. Pega ese objeto en `js/firebase-config.js` y cambia `ADMIN_EMAIL` por tu correo.
6. Abre `firestore.rules` y reemplaza `"tu_correo_admin@ejemplo.com"` por ese mismo correo (debe ser **idéntico**).
7. En Firebase Console → **Firestore Database → Reglas**: pega el contenido de `firestore.rules` y publica.

### 2. Supabase (almacenamiento de las canciones)
1. Ve a [supabase.com](https://supabase.com) → "Start your project" → crea cuenta gratis (no pide tarjeta).
2. "New project" → ponle nombre y contraseña de base de datos (guárdala, no la usarás en el código pero por si acaso) → espera 1-2 min a que se cree.
3. Menú izquierdo ⚙️ **Settings → API** → copia **"Project URL"** y la llave **"anon public"**.
4. Pégalas en `js/supabase-config.js` (`SUPABASE_URL` y `SUPABASE_ANON_KEY`).
5. Menú izquierdo → **SQL Editor → "New query"** → pega TODO el contenido de `supabase-storage-policy.sql` → **Run**. Esto crea el bucket "canciones" con el límite real de 10MB y las políticas de acceso.
6. (Opcional, para verificar visualmente) Ve a **Storage** en el menú izquierdo y confirma que aparece el bucket `canciones`.

### 3. Regístrate como admin PRIMERO
Antes de compartir el link con nadie, abre la página y regístrate tú primero con el correo que pusiste como `ADMIN_EMAIL`. Así tu cuenta queda marcada como administrador desde el inicio 👑.

### 4. Despliega en GitHub Pages
1. Sube esta carpeta a tu repositorio.
2. En el repo: **Settings → Pages → Deploy from branch** → selecciona la rama y la carpeta raíz.
3. Espera unos minutos y tu link `usuario.github.io/repo` estará listo.

---

## ⚠️ Cosas importantes que debes saber (honestidad técnica)

- **Límite de 3 usuarios:** se controla desde el navegador (no con Cloud Functions, para no requerir el plan Blaze/tarjeta, tal como lo pediste). Es suficiente para 3 amigos, pero técnicamente alguien con conocimientos de programación *podría* saltárselo editando el código de la página en su propio navegador. Lo que SÍ es infranqueable por reglas del servidor es que nadie puede auto-nombrarse admin (Firestore) y que ninguna canción puede pesar más de 10MB ni ser de un tipo distinto a audio (esto lo aplica Supabase directamente en el bucket, no se puede saltar).
- **El bucket de Supabase queda técnicamente abierto:** como el login es de Firebase (no de Supabase), el bucket de audio no puede verificar "¿está esta persona logueada?" — solo puede aplicar el límite de tamaño/tipo. En la práctica, solo alguien que consiga tu link Y sepa programar podría abusar de esto. Con 3 amigos usando la página, el riesgo real es bajo.
- **Eliminar usuarios:** el admin puede borrar el *perfil* de alguien desde el panel de administrador (libera su cupo). Esto **no** borra su cuenta de inicio de sesión de Firebase Auth (borrar cuentas ajenas requiere Cloud Functions/Blaze). En la práctica, la persona eliminada simplemente deja de tener perfil dentro de la app, aunque técnicamente su login siga existiendo.
- **Chat efímero:** se borra automáticamente al darle "Salir". Si cierras la pestaña de golpe sin usar ese botón, puede que algún mensaje quede pegado — en ese caso, cualquiera puede seguir chateando con normalidad y se limpia solo la próxima vez que alguien cierre sesión correctamente.
- **Contador de ancho de banda:** es una estimación propia (basada en lo que se sube + reproduce dentro de la app), **no** el dato oficial de consumo de Firebase. Sirve para tener conciencia del uso entre ustedes 3, no como medición exacta de Google.
- **Letras:** en esta v1 se muestran completas mientras suena la canción (no hay resaltado línea por línea tipo karaoke). El código deja un "gancho" (`sincronizarLetraConTiempo`) por si más adelante quieres agregar esa sincronización.

## 📁 Estructura

```
reproductor-retro/
├── index.html
├── css/
│   ├── base.css       (diseño general, fondo, layout)
│   └── skins.css       (las 4 pieles del reproductor)
├── js/
│   ├── firebase-config.js   (tus llaves de Firebase — Auth + Firestore)
│   ├── supabase-config.js    (tus llaves de Supabase — Storage de audio)
│   ├── auth.js                 (login/registro/admin)
│   ├── player.js                (audio + skins + ecualizador + controles portátiles)
│   ├── songs.js                   (subir/listar/calificar canciones)
│   ├── lyrics.js                    (editor de letras)
│   ├── chat.js                        (chat grupal efímero)
│   ├── bandwidth.js                     (contador estimado)
│   └── app.js                             (arranque general)
├── firestore.rules
└── supabase-storage-policy.sql
```

---

## 🟦 Actualización de reproductor — Windows Media Player XP + EQ

Esta edición conserva el motor `HTMLAudioElement` nativo y añade una capa de procesamiento mediante **Web Audio API**. El primer skin seleccionado es Windows Media Player XP; también están disponibles Winamp clásico, iPod Classic y Sony Ericsson Walkman W800i.

### Novedades
- Interfaz principal inspirada en Windows Media Player de la época de Windows XP: marco azul, barra de menús, panel de reproducción, visualizador y controles.
- Ecualizador gráfico real de 10 bandas: 31, 62, 125, 250, 500, 1K, 2K, 4K, 8K y 16K Hz.
- Ajuste de -12 dB a +12 dB, con perfiles Rock, Pop, Clásica, Jazz, Voz y Graves potentes.
- Botón para activar/desactivar el procesamiento y restablecer el ecualizador.
- Visualizador de frecuencias conectado al audio.
- El volumen inicial del elemento de audio ahora coincide con el 80 % mostrado por el control.
- El ecualizador se inicializa de forma diferida para respetar las políticas de reproducción automática del navegador.

### Compatibilidad y CORS del audio
El ecualizador usa `MediaElementAudioSourceNode`, por lo que las URLs remotas de audio deben permitir solicitudes CORS desde el dominio donde se publique la aplicación. Supabase Storage suele servir recursos públicos con cabeceras CORS, pero si una canción deja de escucharse después de activar el procesamiento, revisa la respuesta de red del archivo de audio y confirma que incluya `Access-Control-Allow-Origin` para el sitio (o `*` cuando corresponda). No publiques llaves `service_role` en el frontend.

### Alcance que no se ha alterado
La actualización no cambia autenticación, reglas de Firestore, políticas de Supabase, carga/eliminación de canciones, calificaciones, letras, chat ni contador de ancho de banda. La sincronización de letras línea por línea sigue sin estar implementada: el proyecto original solo muestra la letra completa.

### Nota de pruebas
Los archivos se han revisado estáticamente y se han validado sintácticamente; la reproducción real, el comportamiento CORS y el rendimiento del visualizador deben probarse en el dominio donde estén configurados Firebase y Supabase, con canciones reales. La configuración del proyecto no se incluye porque en el ZIP original los valores de Firebase y Supabase son marcadores de posición.


## 🎵 Skins portátiles — iPod Classic y Sony Ericsson Walkman

La actualización de las carcasas portátiles añade dos interfaces específicas sin reemplazar el motor de audio ni modificar Firebase, Supabase, biblioteca, chat o letras.

### iPod Classic
- Carcasa metálica plateada, pantalla LCD y rueda de control circular inspirada en el Click Wheel.
- Botones de menú, pista anterior, pista siguiente y reproducir/pausar conectados al reproductor real.
- El botón central permite acceder a la biblioteca; el menú en pantalla ofrece accesos a Música, Reproduciendo ahora y Ecualizador.
- En la zona libre de la rueda, el gesto de desplazamiento ajusta el volumen (si está habilitado en el navegador).

### Sony Ericsson Walkman W800i
- Carcasa negra con detalles naranja, inspirada en el teléfono Walkman W800i.
- Pantalla oscura con acentos naranja y teclado físico representado.
- Controles de navegación para pista anterior/siguiente, reproducir/pausar y volumen.
- Tecla Walkman naranja para activar/desactivar el ecualizador.

### Integración
Los controles de ambos skins reutilizan la misma instancia de `HTMLAudioElement`, el mismo ecualizador y la misma biblioteca. Cambiar de apariencia no reinicia la canción ni crea motores de audio adicionales. Las teclas numéricas del teléfono son elementos visuales de la carcasa; las teclas de transporte y navegación sí ejecutan acciones.
