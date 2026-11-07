// ════════════════════════════════════════════════════════════
// 🔧 CONFIGURACIÓN DE FIREBASE
// ════════════════════════════════════════════════════════════
// 1. Ve a https://console.firebase.google.com
// 2. Crea un proyecto (o usa el que ya tienes)
// 3. Activa: Authentication (Email/Password) y Firestore Database
//    (Storage YA NO se usa aquí — los archivos de audio ahora viven
//    en Supabase, ve a js/supabase-config.js)
// 4. En "Configuración del proyecto" > "Tus apps" > "Web", copia tu config
//    y pégala reemplazando el objeto de abajo.
// ════════════════════════════════════════════════════════════

const firebaseConfig = {


  apiKey: "AIzaSyCUQ9McftniRXl7rxZm5IIt5laI7eaJ1KE",


  authDomain: "reproductor-online-1.firebaseapp.com",


  projectId: "reproductor-online-1",


  storageBucket: "reproductor-online-1.firebasestorage.app",


  messagingSenderId: "583298803635",


  appId: "1:583298803635:web:6b8aae2a2fd354b3330dc6"


};

// Nombre de usuario que SIEMPRE será el administrador y nunca puede
// ser eliminado. Debe coincidir con el email que uses para registrarte
// primero como admin.
const ADMIN_EMAIL = "andryus0312@gmail.com";

// Límite de personas permitidas en la app (incluyendo al admin)
const MAX_USUARIOS = 3;

// Límite de tamaño por canción (en bytes) -> 10 MB
const LIMITE_CANCION_BYTES = 10 * 1024 * 1024;

// Máximo de canciones que se pueden subir en un solo lote
const MAX_SUBIDA_LOTE = 5;

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
// Nota: ya no inicializamos firebase.storage() — los archivos de
// audio se manejan con supabaseClient (ver js/supabase-config.js)
