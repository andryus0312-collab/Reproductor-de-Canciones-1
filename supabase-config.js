// ════════════════════════════════════════════════════════════
// 🪣 SUPABASE STORAGE — aquí SÍ se guardan los archivos de audio
//    (Firebase Storage ya no es gratis, así que las canciones
//    viven en Supabase; el login, la lista, el chat y las letras
//    siguen 100% en Firebase)
// ════════════════════════════════════════════════════════════
// 1. Ve a https://supabase.com > "Start your project" (gratis, sin tarjeta)
// 2. Crea un proyecto nuevo, espera 1-2 min a que se aprovisione
// 3. Ve a Settings (⚙️) > API y copia "Project URL" y "anon public" key
// 4. Pégalos abajo

const SUPABASE_URL = "https://bdfymoothvcgkjqwvuqy.supabase.co/rest/v1/";
const SUPABASE_ANON_KEY = "sb_publishable_J5ULm7DE9B93hoK8o7eq-g_ZV-0pg3r";

const NOMBRE_BUCKET = "canciones";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);





