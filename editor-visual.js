/* ══════════════════════════════════════════════════════════════
   editor-visual.js
   Editor Visual WYSIWYG — Tienda Perú
   Réplica 100% fiel del index.html público + capa de administración
   con edición en línea y conexión real a Firebase Firestore.
   ══════════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════
   🔒 0. LOGIN — TOKEN DE ACCESO
   ⚠️ IMPORTANTE: esto es una barrera de INTERFAZ, no seguridad real.
   El token vive en el código fuente, así que cualquiera con acceso
   a este archivo .js puede leerlo. NO uses esto como única protección
   de tus datos: para seguridad real, configura Firebase Authentication
   + Reglas de Seguridad de Firestore que exijan un usuario autenticado
   para escribir en "productos", "ofertas", "libros" y "configuracion".
   ══════════════════════════════════════════════════════ */
const ADMIN_TOKEN = "ghp_mi_token_secreto_123"; // 👈 cámbialo por tu propio token
const TOKEN_STORAGE_KEY = "tiendaPeruEditorToken";

function initLoginGate() {
  const overlay = document.getElementById("loginOverlay");
  const input = document.getElementById("loginTokenInput");
  const btn = document.getElementById("loginSubmitBtn");
  const errorEl = document.getElementById("loginError");

  function unlock() {
    document.body.classList.remove("locked");
    overlay.classList.add("hidden");
  }

  function tryLogin() {
    const value = input.value.trim();
    if (value.length > 0 && value === ADMIN_TOKEN) {
      localStorage.setItem(TOKEN_STORAGE_KEY, value);
      errorEl.textContent = "";
      input.classList.remove("input-error");
      unlock();
    } else {
      errorEl.textContent = "❌ Token incorrecto. Verifica e intenta de nuevo.";
      input.classList.add("input-error");
      input.value = "";
      input.focus();
      setTimeout(() => input.classList.remove("input-error"), 400);
    }
  }

  // ¿Ya había un token válido guardado de una sesión anterior?
  const saved = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (saved === ADMIN_TOKEN) {
    unlock();
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY); // limpia tokens viejos/incorrectos
    input.focus();
  }

  btn.addEventListener("click", tryLogin);
  input.addEventListener("keydown", e => { if (e.key === "Enter") tryLogin(); });
}

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, getDocs, doc, setDoc, updateDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ══════════════════════════════════════════════════════
   🔥 1. CONFIGURACIÓN DE FIREBASE
   ⚠️ REEMPLAZA estos valores con los de tu proyecto real
   (Firebase Console → Configuración del proyecto → Tus apps → SDK setup)
   ══════════════════════════════════════════════════════ */
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBV31eRHUcpQFpQ1xx7VnwGsGqymyy7VhY",
  authDomain: "pangea-clasharch.firebaseapp.com",
  projectId: "pangea-clasharch",
  storageBucket: "pangea-clasharch.firebasestorage.app",
  messagingSenderId: "587653225006",
  appId: "1:587653225006:web:3a00bec7440dd1af839dbf",
  measurementId: "G-PVDZXJJN3C"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const WHATSAPP = "18098502066";

/* ══════════════════════════════════════════════════════
   🖼️ 2. BANCO DE IMÁGENES ORIGINALES (fallback / semilla)
   ══════════════════════════════════════════════════════ */
const IMGS = {
  local: "img/local.jpg",
  p1: "img/p1.jpg", p2: "img/p2.jpg", p3: "img/p3.jpg", p4: "img/p4.jpg",
  p5: "img/p5.jpg", p6: "img/p6.jpg", p7: "img/p7.jpg", p8: "img/p8.jpg",
  p9: "img/p9.jpg", p10: "img/p10.jpg", p11: "img/p11.jpg", p12: "img/p12.jpg",
  p13: "img/p13.jpg", p14: "img/p14.jpg", p15: "img/p15.jpg", p16: "img/p16.jpg", p17: "img/p17.jpg",
  cadenas_mujer: "img/cadenas_mujer.jpg", cadenas_hombre: "img/cadenas_hombre.jpg",
  cargador_a: "img/cargador_a.jpg", cargador_c: "img/cargador_c.jpg",
  cute: "img/cute.jpg", gafas: "img/gafas.jpg", gorras: "img/gorras.jpg",
  collar_mujer: "img/collar_mujer.jpg", collar_hermoso: "img/collar_hermoso.jpg",
  pulseras_set: "img/pulseras_set.jpg", reloj_pulseras: "img/reloj_pulseras.jpg",
  pulseras_hilo: "img/pulseras_hilo.jpg", relojes_pulseras: "img/relojes_pulseras.jpg",
  relojes: "img/relojes.jpg", sombreros: "img/sombreros.jpg", aretes: "img/aretes.jpg",
  audifonos: "img/audifonos.jpg", boina_frances: "img/boina_frances.jpg",
  boinas_frio: "img/boinas_frio.jpg", bulto_grande: "img/bulto_grande.jpg",
  bulto_pequeno: "img/bulto_pequeno.jpg", rosario: "img/rosario.jpg",
  aretesacero: "img/aretesacero.jpg", argolla_de_cruz: "img/argolla_de_cruz.jpg",
  boina_francesa_mujer: "img/boina_francesa-mujer.jpg", bolsa_mujer: "img/bolsa_mujer.jpg",
  brilla_labios: "img/brilla_labios.jpg", cadena_grande: "img/cadena_grande.jpg",
  cadenas_380: "img/cadenas_380.jpg", cartapasio: "img/cartapasio.jpg",
  cuarzo: "img/cuarzo.jpg", guantes_adulto: "img/guantes_adulto.jpg",
  guantes_bebe: "img/guantes_bebe.jpg", guantes_nino: "img/guantes_nino.jpg",
  mochila_de_tiros: "img/mochila_de_tiros.jpg", mochilas: "img/mochilas.jpg",
  panuelos: "img/pañuelos.jpg", pasa_mont_barato: "img/pasa_mont_barato.jpg",
  pasa_montanas: "img/pasa_montañas.jpg", poncho_peruano: "img/poncho_peruano.jpg",
  maestro_espiritista: "img/maestro_espiritista.jpg",
  tormentos_de_sandra: "img/tormentos_de_sandra.jpg",
  juana_del_valle: "img/juana_del_valle.jpg"
};
function img(key) { return IMGS[key] || key || ""; }

/* ══════════════════════════════════════════════════════
   📦 3. DATOS SEMILLA (idénticos al index.html público)
   Se usan SOLO si Firestore aún no tiene documentos en la colección,
   para que el editor se vea 100% igual a la tienda pública la primera vez.
   ══════════════════════════════════════════════════════ */
const SEED_PRODUCTS = [
  { id:"1",  name:"Collar Corazón con Alas + Foto",      price:0,   cat:"joyeria",  badges:["hot"],  img:"p1",   desc:"Medallón corazón con alas. Tu foto personalizada. 2 colores." },
  { id:"2",  name:"Colgante con Foto + Nombre Dorado",   price:0,   cat:"joyeria",  badges:["new"],  img:"p2",   desc:"Tu foto y nombre en letras doradas. Cadena incluida." },
  { id:"3",  name:"Toalla Personalizada Bordada",        price:0,   cat:"joyeria",  badges:[],       img:"p3",   desc:"Toalla premium con tu nombre bordado. 4 colores." },
  { id:"4",  name:"Collar Corazón Forever Loved",        price:0,   cat:"joyeria",  badges:["hot"],  img:"p4",   desc:"Collar dorado con foto y mensaje Forever Loved." },
  { id:"8",  name:"Collar Dog Tag con Foto",             price:0,   cat:"joyeria",  badges:[],       img:"p8",   desc:"Estilo militar con tu foto en alta definición." },
  { id:"14", name:"Set Argollas + Collar con Nombre",    price:0,   cat:"joyeria",  badges:["hot"],  img:"p14",  desc:"Set completo: aretes argolla y collar con nombre dorado." },
  { id:"15", name:"Collar Nombre en Cursiva",            price:0,   cat:"joyeria",  badges:[],       img:"p15",  desc:"Delicado collar dorado con tu nombre en cursiva." },
  { id:"18", name:"Cadenas de Mujer Variadas",           price:145, cat:"joyeria",  badges:["new"],  img:"cadenas_mujer",   desc:"Hermosas cadenas variadas para mujer. Diseños modernos y elegantes." },
  { id:"19", name:"Cadenas Variadas de Hombre",          price:145, priceType:"range", priceMin:145, priceMax:480, cat:"joyeria", badges:["hot"], img:"cadenas_hombre", desc:"Cadenas de hombre: cruces, medallones y más. Dorado y plateado." },
  { id:"20", name:"Hermosa Cadena de Mujer",             price:480, cat:"joyeria",  badges:[],       img:"collar_mujer",    desc:"Cadena brillante con cristales. Ideal para ocasiones especiales." },
  { id:"21", name:"Hermoso Collar de Mujer",             price:380, cat:"joyeria",  badges:["new"],  img:"collar_hermoso",  desc:"Collar artesanal con cristales únicos. Un lujo accesible." },
  { id:"32", name:"Set de Esmaltes & Labiales",          price:35,  cat:"joyeria",  badges:["sale"], img:"cute",            desc:"Set colorido de esmaltes y labiales variados." },
  { id:"39", name:"Rosario Artesanal",                   price:120, cat:"joyeria",  badges:[],       img:"rosario",         desc:"Este rosario artesanal combina la calidez del Ojo de Tigre con el brillo profundo de la Hematita." },
  { id:"42", name:"Cadena Grande con Dije",              price:1550,cat:"joyeria",  badges:["hot"],  img:"cadena_grande",   desc:"Cadena cubana gruesa con dije premium. Diseño exclusivo para hombre." },
  { id:"43", name:"Cadenas Variadas",                    price:380, cat:"joyeria",  badges:["sale"], img:"cadenas_380",     desc:"Variedad de cadenas con dijes: calaveras, corazones y cruces. Dorado y plateado." },
  { id:"44", name:"Collar de Cuarzo Azul",               price:145, cat:"joyeria",  badges:["new"],  img:"cuarzo",          desc:"Collar de cuarzo lapis lazuli con aretes de regalo. Joyería D'Jessy Perú." },
  { id:"45", name:"Brillo de Labios Chap·Lip",           price:60,  cat:"joyeria",  badges:["sale"], img:"brilla_labios",   desc:"Set de brillos labiales hidratantes Chap·Lip. 12 sabores y colores disponibles." },
  { id:"12", name:"Aretes Trepadores con Nombre",        price:0,   cat:"aretes",   badges:["new"],  img:"p12",             desc:"Aretes trepadores 3D con tu nombre. Plateado." },
  { id:"13", name:"Aretes Mariposa con Nombre",          price:0,   cat:"aretes",   badges:[],       img:"p13",             desc:"Mariposa de oro con nombre personalizado." },
  { id:"33", name:"Aretes y Argollas Variados",          price:85,  cat:"aretes",   badges:["new"],  img:"aretes",          desc:"Gran variedad de aretes dorados y plateados. Diseños elegantes para toda ocasión." },
  { id:"40", name:"Aretes de Acero Variados",            price:95,  cat:"aretes",   badges:["new"],  img:"aretesacero",     desc:"Set de aretes de acero inoxidable: triángulos, anclas, flores y más. Dorado y plateado." },
  { id:"41", name:"Argollas de Cruz Negras",             price:120, cat:"aretes",   badges:["new"],  img:"argolla_de_cruz", desc:"Argollas con colgante de cruz en negro mate. Set x18 pares. Estilo urbano y elegante." },
  { id:"22", name:"Set de Reloj + Pulseras Dorado",      price:580, cat:"relojes",  badges:["hot"],  img:"reloj_pulseras",  desc:"Set premium: reloj dorado + 2 pulseras. El regalo perfecto." },
  { id:"23", name:"Relojes Variados",                    price:380, cat:"relojes",  badges:["new"],  img:"relojes",         desc:"Gran variedad de relojes para hombre y mujer." },
  { id:"24", name:"Set de Reloj con Pulseras — Caja",    price:580, cat:"relojes",  badges:["sale"], img:"relojes_pulseras",desc:"Set de lujo en caja de regalo. Reloj + pulseras + collar." },
  { id:"5",  name:"Pulsera Redonda con Foto",            price:0,   cat:"pulseras", badges:[],       img:"p5",              desc:"Pulsera plateada con dije circular y tu foto." },
  { id:"6",  name:"Pulsera Bebé Cruz con Nombre",        price:0,   cat:"pulseras", badges:["new"],  img:"p6",              desc:"Para bebé: cruz con nombre grabado. 3 colores." },
  { id:"7",  name:"Pulsera Ajustable Nombre + Corazón",  price:0,   cat:"pulseras", badges:[],       img:"p7",              desc:"Nombre en cursiva con corazón. Dorado y plateado." },
  { id:"10", name:"Brazalete Rígido con Nombre",         price:0,   cat:"pulseras", badges:["hot"],  img:"p10",             desc:"Brazalete dorado con tu nombre en letras grandes." },
  { id:"11", name:"Brazalete Doble Nombre",              price:0,   cat:"pulseras", badges:[],       img:"p11",             desc:"Dos nombres. Ideal para parejas o mamás." },
  { id:"16", name:"Anillo Infinito con Nombre",          price:0,   cat:"pulseras", badges:["new"],  img:"p16",             desc:"Anillo dorado con símbolo infinito y nombre grabado." },
  { id:"28", name:"Set de Pulseras Variadas",            price:100, cat:"pulseras", badges:["sale"], img:"pulseras_set",    desc:"Hermoso set de pulseras combinadas para regalar. (Cada paquete)" },
  { id:"29", name:"Pulseras de Hilo Coloridas",          price:50,  cat:"pulseras", badges:["sale"], img:"pulseras_hilo",   desc:"Pulseras de hilo en 12+ colores disponibles. (Cada una)" },
  { id:"25", name:"Gafas de Sol Variadas",               price:130, priceType:"range", priceMin:130, priceMax:380, cat:"moda", badges:["hot"], img:"gafas", desc:"Más de 20 estilos. Para él, para ella, para todos." },
  { id:"26", name:"Gorras de Pico Aquatic Sports",       price:280, cat:"moda",     badges:["new"],  img:"gorras",          desc:"Gorras deportivas Aquatic Sports. Negra y blanca." },
  { id:"27", name:"Sombreros Variados",                  price:380, cat:"moda",     badges:[],       img:"sombreros",       desc:"Sombrero panamá y estilo cowboy. Con mucho estilo." },
  { id:"34", name:"Boina Francesa Estilo Vintage",       price:280, cat:"moda",     badges:["new"],  img:"boina_frances",   desc:"Boina negra estilo francés. Elegante y moderna. Talla única." },
  { id:"35", name:"Boinas para el Frío",                 price:250, cat:"moda",     badges:["new"],  img:"boinas_frio",     desc:"Boinas tejidas con pompón. 3 colores: blanco, azul y rosa." },
  { id:"50", name:"Boina Francesa para Mujer",           price:280, cat:"moda",     badges:["new"],  img:"boina_francesa_mujer", desc:"Boina tejida de mujer en negro y rojo. Elegante y abrigadora." },
  { id:"36", name:"Bulto Deportivo Grande Nike",         price:580, cat:"bolsos",   badges:["new"],  img:"bulto_grande",    desc:"Bolso deportivo grande con doble bolsillo. Correa ajustable incluida." },
  { id:"37", name:"Bulto Pequeño Nike",                  price:480, cat:"bolsos",   badges:["hot"],  img:"bulto_pequeno",   desc:"Bolso pequeño resistente. Compacto, ligero y con estilo." },
  { id:"46", name:"Bolsa de Mujer Decorada",             price:380, cat:"bolsos",   badges:["new"],  img:"bolsa_mujer",     desc:"Bolsa tote estampada con lentejuelas y diseño artístico. Ideal para salidas diarias." },
  { id:"47", name:"Cartapacio / Maletín de Trabajo",     price:680, cat:"bolsos",   badges:["new"],  img:"cartapasio",      desc:"Maletín ejecutivo resistente. Compartimento para laptop. Correa cruzada incluida." },
  { id:"48", name:"Mochila de Tiros (Drawstring)",       price:150, cat:"bolsos",   badges:["new"],  img:"mochila_de_tiros",desc:"Mochila de cuerdas ligera con estampado anime. Perfecta para el día a día." },
  { id:"49", name:"Mochilas Escolares Variadas",         price:680, cat:"bolsos",   badges:["hot"],  img:"mochilas",        desc:"Mochilas escolares resistentes para niños y adultos. Varios colores y tamaños." },
  { id:"51", name:"Pasamontañas Air Flow",               price:380, cat:"ropa",     badges:["new"],  img:"pasa_montanas",   desc:"Pasamontañas deportivo Air Flow con ventilación. Ideal para motociclistas y montañismo." },
  { id:"52", name:"Pasamontañas para Moto",              price:145, cat:"ropa",     badges:["sale"], img:"pasa_mont_barato",desc:"Pasamontañas tejido, abrigador y económico. 3 colores disponibles: beige, rojo y negro." },
  { id:"53", name:"Guantes para Adulto",                 price:195, cat:"ropa",     badges:["new"],  img:"guantes_adulto",  desc:"Guantes tejidos para adulto. Suaves, elásticos y cálidos. Color negro." },
  { id:"54", name:"Guantes para Niño",                   price:180, cat:"ropa",     badges:["new"],  img:"guantes_nino",    desc:"Guantes tejidos para niño. Talla infantil, suaves y abrigadores. Color gris." },
  { id:"55", name:"Guantes para Bebé",                   price:160, cat:"ropa",     badges:["new"],  img:"guantes_bebe",    desc:"Guantes pequeños para bebé. Ultra suaves y cálidos. Color oscuro." },
  { id:"56", name:"Pañuelos / Bandanas Variados",        price:85,  cat:"ropa",     badges:["sale"], img:"panuelos",        desc:"Pañuelos y bandanas estampados. Varios colores: amarillo, azul, rojo y blanco." },
  { id:"57", name:"Poncho Peruano Tejido",               price:0,   cat:"ropa",     badges:["hot"],  img:"poncho_peruano",  desc:"Poncho peruano tejido con diseños andinos. 100% artesanal. Consultar colores disponibles." },
  { id:"30", name:"Cargador Rápido Tipo A — 2.4A",       price:240, cat:"tecnologia",badges:["new"],  img:"cargador_a",      desc:"Cargador Meidou 2.4A con cable. Compatible con Android." },
  { id:"31", name:"Cargador 2 en 1 Tipo C — 2.1A",       price:240, cat:"tecnologia",badges:[],       img:"cargador_c",      desc:"Cargador de viaje 2 en 1. Rápido, compacto y confiable." },
  { id:"38", name:"Audífonos Estéreo con Cable",          price:145, cat:"tecnologia",badges:["sale"], img:"audifonos",       desc:"Audífonos estéreo M-914 con micrófono. Alta calidad de sonido." }
];

const SEED_DEALS = [
  { id:"201", name:"Pulseras de Hilo",        price:50,  img:"pulseras_hilo",  badge:"Desde RD$100", desc:"12+ colores" },
  { id:"202", name:"Audífonos Estéreo",       price:145, img:"audifonos",      badge:"Tecnología",   desc:"Con micrófono" },
  { id:"203", name:"Set Esmaltes & Labiales", price:35,  img:"cute",           badge:"Belleza",      desc:"Set colorido" },
  { id:"204", name:"Cargador Tipo A 2.4A",    price:240, img:"cargador_a",     badge:"Nuevo",        desc:"Con cable USB" },
  { id:"205", name:"Gorras Deportivas",       price:280, img:"gorras",         badge:"Moda",         desc:"2 colores" },
  { id:"206", name:"Aretes Variados",         price:85,  img:"aretes",         badge:"Popular",      desc:"Dorado y plateado" },
  { id:"207", name:"Gafas de Sol",            price:145, img:"gafas",          badge:"Oferta",       desc:"20+ estilos" },
  { id:"208", name:"Boina Francesa",          price:280, img:"boina_frances",  badge:"Nuevo",        desc:"Estilo vintage" }
];

const SEED_LIBROS = [
  { id:"lib1", series:"En las Arterias de la República II", title:"De los Santos, el Maestro Espiritista Cibaeño",
    img:"maestro_espiritista", author:"Johnny Martínez Quispe",
    synopsis:"El autor conjuga lo sentimental con lo jocoso y lo subliminal con lo increíble. A través de relatos magistrales como \"La Abuela\" y \"El Mercader de la Fe\", nos sumerge en el panorama del espiritismo cibaeño, las creencias locales y ofrece una crítica a las realidades sociales y religiosas, demostrando que a veces la ficción parece ser realidad." },
  { id:"lib2", series:"En las Arterias de la República", title:"Los Tormentos de Sandra",
    img:"tormentos_de_sandra", author:"Johnny Martínez Quispe",
    synopsis:"Un profundo grito social que narra la cruda historia de Sandra, una joven de barrio marginado que anhela tener su propia familia en medio de la miseria. A través de sus vivencias, la obra expone realidades palpables de la sociedad: ayuntamientos, dueños de tierras, la prensa, la salud pública y la corrupción. Un relato realista que cautivará la atención." },
  { id:"lib3", series:"En las Arterias de la República III", title:"Juana del Valle",
    img:"juana_del_valle", author:"Johnny Martínez Quispe",
    synopsis:"Una joya literaria que narra la gran realidad de cualquier jovencita en una comunidad rural. Incluye relatos impactantes como \"El Crimen Perfecto\" y \"Crimen y Duelo con Machete\", además de agudas reflexiones sobre la explotación social y la moralidad de la clase media en cuentos como \"Lill en Europa\" y \"Hombres Ejecutivos\"." }
];

const SEED_CONFIG = {
  navTopText: "📍 Calle Luperón, Constanza · Al frente de EDENORTE",
  heroBadge: "📍 Constanza, República Dominicana · El Arte de los Andes",
  heroTitle: "Accesorios,<br/>Moda &<em> Mucho Más</em>",
  heroSub: "Joyería personalizada, relojes, bolsos, moda y tecnología básica. Todo en Constanza al mejor precio. Reserva tu producto y retíralo en tienda.",
  aboutTitle: "El Arte de <em>los Andes</em><br/>en Constanza",
  aboutP1: "Somos Tienda Perú, ubicados en Constanza, República Dominicana. Ofrecemos una amplia variedad de accesorios de moda, joyería personalizada, relojes, bolsos, gorras, gafas y tecnología básica.",
  aboutP2: "Llevamos años siendo el destino de confianza de la comunidad de Constanza para regalo y moda accesible.",
  contactAddress: "Calle Luperón, Constanza<br/>Al frente de EDENORTE, RD",
  contactWhatsapp: "+1 (809) 850-2066<br/>Reservas y consultas",
  heroBg: img("local"),
  aboutImg: img("local")
};

const CATS = [
  { id:"todos",      name:"Todos",        icon:"✨",              img:null },
  { id:"joyeria",    name:"Joyería",      img:"cadenas_mujer",    icon:null },
  { id:"aretes",     name:"Aretes",       img:"aretes",           icon:null },
  { id:"relojes",    name:"Relojes",      img:"relojes",          icon:null },
  { id:"pulseras",   name:"Pulseras",     img:"pulseras_hilo",    icon:null },
  { id:"moda",       name:"Moda",         img:"gorras",           icon:null },
  { id:"bolsos",     name:"Bolsos",       img:"bulto_grande",     icon:null },
  { id:"tecnologia", name:"Tecnología",   img:"audifonos",        icon:null },
  { id:"ropa",       name:"Ropa & Frío",  img:"poncho_peruano",   icon:null }
];
const FILTER_CATS = [
  { id:"todos",      label:"✨ Todos" },
  { id:"joyeria",    label:"💎 Joyería" },
  { id:"aretes",     label:"👂 Aretes" },
  { id:"relojes",    label:"⌚ Relojes" },
  { id:"pulseras",   label:"💫 Pulseras" },
  { id:"moda",       label:"👒 Moda" },
  { id:"bolsos",     label:"👜 Bolsos" },
  { id:"tecnologia", label:"🔌 Tecnología" },
  { id:"ropa",       label:"🧥 Ropa & Frío" }
];
const BADGE_MAP = { new:["badge-new","Nuevo"], hot:["badge-hot","🔥 Popular"], sale:["badge-sale","Oferta"] };

/* ══════════════════════════════════════════════════════
   🗂️ 4. ESTADO EN MEMORIA (lo que ve el editor ahora mismo)
   ══════════════════════════════════════════════════════ */
let PRODUCTS = [];
let DEALS = [];
let LIBROS = [];
let CONFIG = {};

/* ══════════════════════════════════════════════════════
   📝 5. REGISTRO DE CAMBIOS PENDIENTES
   Estructura: { productos:{added:Map,updated:Map,deletedIds:Set},
                 ofertas:{...}, libros:{...}, configuracion:{fields:Map} }
   ══════════════════════════════════════════════════════ */
const pending = {
  productos:     { added: new Map(), updated: new Map(), deletedIds: new Set() },
  ofertas:       { added: new Map(), updated: new Map(), deletedIds: new Set() },
  libros:        { added: new Map(), updated: new Map(), deletedIds: new Set() },
  configuracion: { fields: new Map() }
};
let newIdCounter = 1;
function makeTempId(prefix) { return `nuevo_${prefix}_${Date.now()}_${newIdCounter++}`; }
function isTempId(id) { return typeof id === "string" && id.startsWith("nuevo_"); }

function markUpdated(collectionName, id, obj) {
  const p = pending[collectionName];
  if (isTempId(id)) {
    // Todavía no existe en Firestore: sigue siendo un "added"
    p.added.set(id, obj);
  } else {
    p.updated.set(id, obj);
  }
  refreshPendingUI();
}
function markAdded(collectionName, id, obj) {
  pending[collectionName].added.set(id, obj);
  refreshPendingUI();
}
function markDeleted(collectionName, id) {
  const p = pending[collectionName];
  if (isTempId(id)) {
    // Nunca se guardó: simplemente se descarta del "added"
    p.added.delete(id);
  } else {
    p.deletedIds.add(id);
    p.updated.delete(id);
  }
  refreshPendingUI();
}
function markConfigField(field, value) {
  pending.configuracion.fields.set(field, value);
  refreshPendingUI();
}

function countPending() {
  let n = 0;
  for (const key of ["productos","ofertas","libros"]) {
    n += pending[key].added.size + pending[key].updated.size + pending[key].deletedIds.size;
  }
  n += pending.configuracion.fields.size;
  return n;
}
function refreshPendingUI() {
  const count = countPending();
  document.getElementById("asbCount").textContent = count;
  document.getElementById("asbSave").disabled = count === 0;
}

/* ══════════════════════════════════════════════════════
   ☁️ 6. CARGA INICIAL DESDE FIRESTORE (con fallback a semillas)
   ══════════════════════════════════════════════════════ */
async function loadCollectionOrSeed(name, seed) {
  try {
    const snap = await getDocs(collection(db, name));
    if (snap.empty) return seed.map(x => ({ ...x }));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn(`No se pudo leer la colección "${name}" de Firestore, usando datos de respaldo.`, err);
    return seed.map(x => ({ ...x }));
  }
}
async function loadConfigOrSeed() {
  try {
    const snap = await getDocs(collection(db, "configuracion"));
    if (snap.empty) return { ...SEED_CONFIG };
    const doc0 = snap.docs.find(d => d.id === "site") || snap.docs[0];
    return { ...SEED_CONFIG, ...doc0.data() };
  } catch (err) {
    console.warn("No se pudo leer 'configuracion' de Firestore, usando datos de respaldo.", err);
    return { ...SEED_CONFIG };
  }
}

async function loadAll() {
  [PRODUCTS, DEALS, LIBROS, CONFIG] = await Promise.all([
    loadCollectionOrSeed("productos", SEED_PRODUCTS),
    loadCollectionOrSeed("ofertas", SEED_DEALS),
    loadCollectionOrSeed("libros", SEED_LIBROS),
    loadConfigOrSeed()
  ]);
}

/* ══════════════════════════════════════════════════════
   🎨 7. RENDERIZADO — idéntico visualmente al index.html
   ══════════════════════════════════════════════════════ */
function applyConfigToDOM() {
  document.querySelector('[data-cfg="navTopText"]').innerHTML = CONFIG.navTopText;
  document.querySelector('[data-cfg="heroBadge"]').innerHTML = CONFIG.heroBadge;
  document.getElementById("heroTitleEl").innerHTML = CONFIG.heroTitle;
  document.querySelector('[data-cfg="heroSub"]').innerHTML = CONFIG.heroSub;
  document.querySelector('[data-cfg="aboutTitle"]').innerHTML = CONFIG.aboutTitle;
  document.querySelector('[data-cfg="aboutP1"]').innerHTML = CONFIG.aboutP1;
  document.querySelector('[data-cfg="aboutP2"]').innerHTML = CONFIG.aboutP2;
  document.querySelector('[data-cfg="contactAddress"]').innerHTML = CONFIG.contactAddress;
  document.querySelector('[data-cfg="contactWhatsapp"]').innerHTML = CONFIG.contactWhatsapp;
  document.getElementById("heroBg").style.backgroundImage = `url(${CONFIG.heroBg || img("local")})`;
  document.getElementById("aboutImg").src = CONFIG.aboutImg || img("local");
}

function renderCats() {
  document.getElementById("catGrid").innerHTML = CATS.map(c => `
    <div class="cat-pill ${c.id==="todos"?"active":""}" data-cat="${c.id}">
      ${c.img ? `<img class="cat-pill-img" src="${img(c.img)}" alt="${c.name}"/>` : `<div class="cat-pill-icon">${c.icon}</div>`}
      <div class="cat-pill-name">${c.name}</div>
    </div>
  `).join("");
  document.querySelectorAll(".cat-pill").forEach(p => {
    p.addEventListener("click", () => filterByCat(p.dataset.cat));
  });
}

function filterByCat(cat) {
  document.querySelectorAll(".cat-pill").forEach(p => p.classList.toggle("active", p.dataset.cat === cat));
  document.querySelectorAll(".fpill").forEach(p => p.classList.toggle("active", p.dataset.cat === cat));
  applyFilter(cat);
  showView("productos");
}

function renderFilters() {
  document.getElementById("filterPills").innerHTML = FILTER_CATS.map(c =>
    `<button class="fpill ${c.id==="todos"?"active":""}" data-cat="${c.id}">${c.label}</button>`
  ).join("");
  document.querySelectorAll(".fpill").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".fpill").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      document.querySelectorAll(".cat-pill").forEach(p => p.classList.toggle("active", p.dataset.cat === btn.dataset.cat));
      applyFilter(btn.dataset.cat);
    });
  });
}

function getCurrentCat() { return document.querySelector(".fpill.active")?.dataset.cat ?? "todos"; }

function applyFilter(cat) {
  const minVal = parseFloat(document.getElementById("priceMin")?.value) || null;
  const maxVal = parseFloat(document.getElementById("priceMax")?.value) || null;
  let count = 0;
  document.querySelectorAll(".product-card").forEach(card => {
    const catOk = cat === "todos" || card.dataset.cat === cat;
    const ep = parseFloat(card.dataset.price);
    let priceOk = true;
    if (!isNaN(ep) && ep > 0 && (minVal !== null || maxVal !== null)) {
      if (minVal !== null && ep < minVal) priceOk = false;
      if (maxVal !== null && ep > maxVal) priceOk = false;
    }
    const show = catOk && priceOk;
    card.classList.toggle("hidden", !show);
    if (show) count++;
  });
  document.getElementById("prodCountLabel").textContent = `${count} producto${count !== 1 ? "s" : ""}`;
}

function effectivePrice(p) {
  if (p.priceType === "range" || (p.priceMin != null && p.priceMax != null)) return p.priceMin;
  if (p.price === 0) return "";
  return p.price;
}

function buildPriceBlock(p) {
  if (p.price === 0 && p.priceType !== "range") {
    return `
      <div class="product-price">
        <span class="price-consult editable" contenteditable="true" data-field="priceLabel" data-hint="Consultar por WhatsApp">👉 Consultar por WhatsApp</span>
      </div>
      <button class="btn-consult" data-wa-name="${escAttr(p.name)}">📲 Consultar</button>`;
  }
  if (p.priceType === "range") {
    return `
      <div class="price-range">
        <span class="range-label">Precio</span>
        <span class="range-val"><span class="cur">RD$</span>
          <span class="editable editable-price" contenteditable="true" data-field="priceMin">${p.priceMin ?? 0}</span>
          <span class="range-max">— <span class="editable editable-price" contenteditable="true" data-field="priceMax">${p.priceMax ?? 0}</span></span>
        </span>
      </div>
      <button class="add-btn" data-id="${p.id}" data-name="${escAttr(p.name)}" data-price="${p.priceMin}" data-img="${escAttr(p.img)}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
        Reservar
      </button>`;
  }
  return `
    <div class="product-price">
      <span class="price-label">Precio</span>
      <span class="price-value"><span class="cur">RD$</span> <span class="editable editable-price" contenteditable="true" data-field="price">${p.price}</span></span>
    </div>
    <button class="add-btn" data-id="${p.id}" data-name="${escAttr(p.name)}" data-price="${p.price}" data-img="${escAttr(p.img)}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
      Reservar
    </button>`;
}

function escAttr(s) { return String(s ?? "").replace(/"/g, "&quot;"); }
function resolveImgSrc(val) {
  if (!val) return img("local");
  if (val.startsWith("data:") || val.startsWith("http") || val.startsWith("img/")) return val;
  return img(val);
}

function renderProducts() {
  const grid = document.getElementById("productsGrid");
  grid.innerHTML = PRODUCTS.map(p => {
    const ep = effectivePrice(p);
    const quickInner = (p.price === 0 && p.priceType !== "range")
      ? `<button class="btn-consult" data-wa-name="${escAttr(p.name)}">📲 Consultar por WhatsApp</button>`
      : `<button class="prod-quick-btn" data-id="${p.id}" data-name="${escAttr(p.name)}" data-price="${p.priceType==="range" ? p.priceMin : p.price}" data-img="${escAttr(p.img)}">🛒 Agregar al carrito</button>`;
    return `
    <div class="product-card" data-cat="${p.cat}" data-id="${p.id}" data-price="${ep}">
      <button class="admin-del-btn" data-action="delete" data-collection="productos" data-id="${p.id}" title="Eliminar producto">🗑️</button>
      <div class="product-img-wrap">
        <img class="img-editable" data-collection="productos" data-id="${p.id}" src="${resolveImgSrc(p.img)}" alt="${escAttr(p.name)}" loading="lazy"/>
        <div class="product-badges">
          ${(p.badges||[]).map(b => BADGE_MAP[b] ? `<span class="badge ${BADGE_MAP[b][0]}">${BADGE_MAP[b][1]}</span>` : "").join("")}
        </div>
        <button class="prod-wish" title="Guardar">🤍</button>
        <div class="prod-quick">${quickInner}</div>
      </div>
      <div class="product-info">
        <div class="product-cat">${p.cat}</div>
        <div class="product-name editable" contenteditable="true" data-collection="productos" data-id="${p.id}" data-field="name">${escHtml(p.name)}</div>
        <div class="product-desc editable" contenteditable="true" data-collection="productos" data-id="${p.id}" data-field="desc">${escHtml(p.desc)}</div>
        <div class="product-footer" data-collection="productos" data-id="${p.id}">
          ${buildPriceBlock(p)}
        </div>
      </div>
    </div>`;
  }).join("") + `
    <div class="admin-add-card" id="addProductCard">
      <span class="aa-icon">➕</span>
      <span>Añadir Nuevo<br/>Producto</span>
    </div>`;

  document.getElementById("prodCountLabel").textContent = `${PRODUCTS.length} productos`;
  attachCardEvents();
  bindEditableFields(grid, "productos", PRODUCTS);
  bindImageUploads(grid, "productos", PRODUCTS);
  bindDeleteButtons(grid, "productos", PRODUCTS, () => renderProducts());
  document.getElementById("addProductCard").addEventListener("click", () => addNewProduct());
  animateCards();
}

function renderDeals() {
  const grid = document.getElementById("dealsGrid");
  grid.innerHTML = DEALS.map(d => `
    <div class="deal-card" data-id="${d.id}">
      <button class="admin-del-btn" data-action="delete" data-collection="ofertas" data-id="${d.id}" title="Eliminar oferta">🗑️</button>
      <div class="deal-img">
        <img class="img-editable" data-collection="ofertas" data-id="${d.id}" src="${resolveImgSrc(d.img)}" alt="${escAttr(d.name)}" loading="lazy"/>
        <span class="deal-badge editable" contenteditable="true" data-collection="ofertas" data-id="${d.id}" data-field="badge">${escHtml(d.badge)}</span>
      </div>
      <div class="deal-body">
        <div class="deal-name editable" contenteditable="true" data-collection="ofertas" data-id="${d.id}" data-field="name">${escHtml(d.name)}</div>
        <div class="deal-desc editable" contenteditable="true" data-collection="ofertas" data-id="${d.id}" data-field="desc">${escHtml(d.desc)}</div>
        <div class="deal-foot">
          <div class="deal-price">RD$ <span class="editable editable-price" contenteditable="true" data-collection="ofertas" data-id="${d.id}" data-field="price">${d.price}</span></div>
          <button class="deal-add" data-id="${d.id}" data-name="${escAttr(d.name)}" data-price="${d.price}" data-img="${escAttr(d.img)}">+ Reservar</button>
        </div>
      </div>
    </div>
  `).join("") + `
    <div class="admin-add-card" id="addDealCard">
      <span class="aa-icon">➕</span>
      <span>Añadir Nueva<br/>Oferta</span>
    </div>`;

  document.querySelectorAll(".deal-add").forEach(btn => {
    btn.addEventListener("click", () => {
      addToCart({ id: btn.dataset.id, name: btn.dataset.name, price: parseFloat(btn.dataset.price), img: btn.dataset.img });
      btn.textContent = "✓ Listo!";
      btn.style.background = "#10B981";
      setTimeout(() => { btn.textContent = "+ Reservar"; btn.style.background = ""; }, 1600);
    });
  });

  bindEditableFields(grid, "ofertas", DEALS);
  bindImageUploads(grid, "ofertas", DEALS);
  bindDeleteButtons(grid, "ofertas", DEALS, () => renderDeals());
  document.getElementById("addDealCard").addEventListener("click", () => addNewDeal());
  animateCards();
}

function renderLibros() {
  const grid = document.getElementById("librosGrid");
  grid.innerHTML = LIBROS.map(b => `
    <div class="lit-book-card" data-id="${b.id}">
      <button class="admin-del-btn" data-action="delete" data-collection="libros" data-id="${b.id}" title="Eliminar libro">🗑️</button>
      <div class="lit-book-img-wrap">
        <img class="img-editable" data-collection="libros" data-id="${b.id}" src="${resolveImgSrc(b.img)}" alt="${escAttr(b.title)}" loading="lazy"/>
        <span class="lit-book-badge">📖 Disponible</span>
      </div>
      <div class="lit-book-body">
        <div class="lit-book-series editable" contenteditable="true" data-collection="libros" data-id="${b.id}" data-field="series">${escHtml(b.series)}</div>
        <div class="lit-book-title editable" contenteditable="true" data-collection="libros" data-id="${b.id}" data-field="title">${escHtml(b.title)}</div>
        <div class="lit-book-divider"></div>
        <p class="lit-book-synopsis editable" contenteditable="true" data-collection="libros" data-id="${b.id}" data-field="synopsis">${escHtml(b.synopsis)}</p>
        <div class="lit-book-footer">
          <span class="lit-book-author-mini editable" contenteditable="true" data-collection="libros" data-id="${b.id}" data-field="author">${escHtml(b.author)}</span>
          <button class="lit-book-wa" data-wa-title="${escAttr(b.title)}">📲 Consultar</button>
        </div>
      </div>
    </div>
  `).join("") + `
    <div class="admin-add-card" id="addLibroCard">
      <span class="aa-icon">➕</span>
      <span>Añadir Nuevo<br/>Libro</span>
    </div>`;

  document.querySelectorAll(".lit-book-wa").forEach(btn => {
    btn.addEventListener("click", () => {
      const msg = `Hola, quiero información sobre el libro: ${btn.dataset.waTitle}`;
      window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`, "_blank");
    });
  });

  bindEditableFields(grid, "libros", LIBROS);
  bindImageUploads(grid, "libros", LIBROS);
  bindDeleteButtons(grid, "libros", LIBROS, () => renderLibros());
  document.getElementById("addLibroCard").addEventListener("click", () => addNewLibro());
}

function escHtml(s) {
  return String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

function attachCardEvents() {
  document.querySelectorAll(".add-btn, .prod-quick-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      addToCart({ id: btn.dataset.id, name: btn.dataset.name, price: parseFloat(btn.dataset.price), img: btn.dataset.img });
      const isQuick = btn.classList.contains("prod-quick-btn");
      if (!isQuick) {
        btn.innerHTML = "✓ Reservado";
        btn.style.background = "#10B981"; btn.style.color = "#fff"; btn.style.borderColor = "#10B981";
        setTimeout(() => {
          btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>Reservar`;
          btn.style.background = ""; btn.style.color = ""; btn.style.borderColor = "";
        }, 1600);
      }
    });
  });
  document.querySelectorAll(".btn-consult").forEach(btn => {
    btn.addEventListener("click", () => {
      const nombre = btn.dataset.waName || "este producto";
      const msg = `Hola, quiero información sobre: ${nombre}`;
      window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`, "_blank");
    });
  });
  document.querySelectorAll(".prod-wish").forEach(btn => {
    btn.addEventListener("click", () => { btn.textContent = btn.textContent === "🤍" ? "❤️" : "🤍"; });
  });
}

/* ══════════════════════════════════════════════════════
   ✏️ 8. EDICIÓN EN LÍNEA — texto (contenteditable)
   ══════════════════════════════════════════════════════ */
function findItem(list, id) { return list.find(x => String(x.id) === String(id)); }

function bindEditableFields(container, collectionName, list) {
  container.querySelectorAll(`[contenteditable="true"][data-collection="${collectionName}"]`).forEach(el => {
    el.addEventListener("blur", () => {
      const id = el.dataset.id;
      const field = el.dataset.field;
      const item = findItem(list, id);
      if (!item) return;
      let val = el.textContent.trim();
      if (field === "price" || field === "priceMin" || field === "priceMax") {
        val = parseFloat(val.replace(/[^\d.]/g,"")) || 0;
      }
      if (item[field] === val) return;
      item[field] = val;
      el.classList.add("field-dirty");
      markUpdated(collectionName, id, item);
    });
    el.addEventListener("keydown", e => {
      if (e.key === "Enter" && !el.classList.contains("lit-book-synopsis") && !el.classList.contains("product-desc") && !el.classList.contains("deal-desc")) {
        e.preventDefault(); el.blur();
      }
    });
  });
}

/* ══════════════════════════════════════════════════════
   🖼️ 9. EDICIÓN DE IMÁGENES — subida y conversión a Base64
   ══════════════════════════════════════════════════════ */
let currentImgUploadTarget = null; // { collectionName, id, list, isCfg, cfgField, el }

function bindImageUploads(container, collectionName, list) {
  container.querySelectorAll(`.img-editable[data-collection="${collectionName}"]`).forEach(el => {
    el.addEventListener("click", () => {
      currentImgUploadTarget = { collectionName, id: el.dataset.id, list, isCfg: false, el };
      document.getElementById("imgUploadInput").click();
    });
  });
}
function bindConfigImageUploads() {
  document.querySelectorAll(".img-editable[data-cfg-img]").forEach(el => {
    el.addEventListener("click", () => {
      currentImgUploadTarget = { isCfg: true, cfgField: el.dataset.cfgImg, el };
      document.getElementById("imgUploadInput").click();
    });
  });
}

document.getElementById("imgUploadInput").addEventListener("change", e => {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file || !currentImgUploadTarget) return;
  if (!file.type.startsWith("image/")) { showAdminToast("El archivo debe ser una imagen.", true); return; }
  const reader = new FileReader();
  reader.onload = () => {
    const base64 = reader.result;
    const t = currentImgUploadTarget;
    if (t.isCfg) {
      CONFIG[t.cfgField] = base64;
      if (t.el.tagName === "IMG") t.el.src = base64;
      else t.el.style.backgroundImage = `url(${base64})`;
      t.el.classList.add("field-dirty");
      markConfigField(t.cfgField, base64);
    } else {
      const item = findItem(t.list, t.id);
      if (!item) return;
      item.img = base64;
      t.el.src = base64;
      t.el.classList.add("field-dirty");
      markUpdated(t.collectionName, t.id, item);
    }
  };
  reader.readAsDataURL(file);
});

/* ══════════════════════════════════════════════════════
   🗑️ 10. ELIMINAR TARJETAS
   ══════════════════════════════════════════════════════ */
function bindDeleteButtons(container, collectionName, list, rerender) {
  container.querySelectorAll(`.admin-del-btn[data-collection="${collectionName}"]`).forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const id = btn.dataset.id;
      if (!confirm("¿Eliminar este elemento? Se quitará de la pantalla y se borrará de Firebase al guardar.")) return;
      const idx = list.findIndex(x => String(x.id) === String(id));
      if (idx > -1) list.splice(idx, 1);
      markDeleted(collectionName, id);
      rerender();
    });
  });
}

/* ══════════════════════════════════════════════════════
   ➕ 11. AÑADIR NUEVOS ELEMENTOS
   ══════════════════════════════════════════════════════ */
function addNewProduct() {
  const usarPrecioFijo = confirm(
    "¿Deseas que el producto tenga un PRECIO FIJO?\n\n" +
    "Aceptar = Precio Fijo (editable, ej. RD$100)\n" +
    "Cancelar = Botón \"Consultar por WhatsApp\" (precio a consultar)"
  );

  const id = makeTempId("prod");
  const item = usarPrecioFijo
    ? { id, name:"Nuevo Producto", desc:"Descripción del producto…", price:100, priceType:"normal", cat:"joyeria", badges:[], img:"local" }
    : { id, name:"Nuevo Producto", desc:"Descripción del producto…", price:0,   priceType:"normal", cat:"joyeria", badges:[], img:"local" };

  PRODUCTS.push(item);
  markAdded("productos", id, item);
  renderProducts();
  scrollToCard(`.product-card[data-id="${id}"]`);
}
function addNewDeal() {
  const id = makeTempId("deal");
  const item = { id, name:"Nueva Oferta", desc:"Descripción breve", price:0, img:"local", badge:"Nuevo" };
  DEALS.push(item);
  markAdded("ofertas", id, item);
  renderDeals();
  scrollToCard(`.deal-card[data-id="${id}"]`);
}
function addNewLibro() {
  const id = makeTempId("libro");
  const item = { id, series:"Nueva Colección", title:"Nuevo Libro", synopsis:"Sinopsis del libro…", author:"Johnny Martínez Quispe", img:"local" };
  LIBROS.push(item);
  markAdded("libros", id, item);
  renderLibros();
  scrollToCard(`.lit-book-card[data-id="${id}"]`);
}
function scrollToCard(selector) {
  setTimeout(() => {
    const el = document.querySelector(selector);
    if (el) el.scrollIntoView({ behavior:"smooth", block:"center" });
  }, 60);
}

/* ══════════════════════════════════════════════════════
   ⚙️ 12. EDICIÓN DE CONFIGURACIÓN (Hero / Cabecera)
   ══════════════════════════════════════════════════════ */
function bindConfigFields() {
  document.querySelectorAll('.cfg-field[contenteditable="true"]').forEach(el => {
    el.addEventListener("blur", () => {
      const field = el.dataset.cfg;
      const val = el.innerHTML.trim();
      if (CONFIG[field] === val) return;
      CONFIG[field] = val;
      el.classList.add("field-dirty");
      markConfigField(field, val);
    });
  });
  bindConfigImageUploads();
}

/* ══════════════════════════════════════════════════════
   💾 13. GUARDAR CAMBIOS EN FIREBASE
   ══════════════════════════════════════════════════════ */
async function saveAllChanges() {
  const btn = document.getElementById("asbSave");
  btn.disabled = true;
  btn.classList.add("saving");
  btn.textContent = "💾 Guardando…";
  try {
    const tasks = [];

    for (const colName of ["productos","ofertas","libros"]) {
      const p = pending[colName];
      for (const [id, data] of p.added) {
        const { id: _drop, ...rest } = data;
        tasks.push(setDoc(doc(db, colName, id.startsWith("nuevo_") ? cleanFirestoreId(id) : id), rest));
      }
      for (const [id, data] of p.updated) {
        const { id: _drop, ...rest } = data;
        tasks.push(updateDoc(doc(db, colName, id), rest));
      }
      for (const id of p.deletedIds) {
        tasks.push(deleteDoc(doc(db, colName, id)));
      }
    }

    if (pending.configuracion.fields.size > 0) {
      const cfgUpdate = {};
      for (const [field, val] of pending.configuracion.fields) cfgUpdate[field] = val;
      tasks.push(setDoc(doc(db, "configuracion", "site"), cfgUpdate, { merge: true }));
    }

    await Promise.all(tasks);

    // Limpia el registro de pendientes
    for (const colName of ["productos","ofertas","libros"]) {
      pending[colName].added.clear();
      pending[colName].updated.clear();
      pending[colName].deletedIds.clear();
    }
    pending.configuracion.fields.clear();
    document.querySelectorAll(".field-dirty").forEach(el => el.classList.remove("field-dirty"));

    showAdminToast("✅ Cambios guardados en Firebase correctamente.");
  } catch (err) {
    console.error(err);
    showAdminToast("❌ Error al guardar. Revisa tu configuración de Firebase y la consola.", true);
  } finally {
    btn.classList.remove("saving");
    btn.textContent = "💾 Guardar Cambios en Firebase";
    refreshPendingUI();
  }
}
function cleanFirestoreId(tempId) {
  // Genera un id legible/único a partir del id temporal para el documento nuevo
  return tempId.replace(/^nuevo_/, "");
}

function showAdminToast(msg, isError=false) {
  const t = document.getElementById("adminToast");
  t.textContent = msg;
  t.classList.toggle("error", isError);
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 3200);
}

document.getElementById("asbSave").addEventListener("click", saveAllChanges);
document.getElementById("asbDiscard").addEventListener("click", async () => {
  if (!confirm("¿Descartar todos los cambios locales no guardados? Se recargarán los datos originales.")) return;
  for (const colName of ["productos","ofertas","libros"]) {
    pending[colName].added.clear();
    pending[colName].updated.clear();
    pending[colName].deletedIds.clear();
  }
  pending.configuracion.fields.clear();
  await bootstrapData();
  refreshPendingUI();
  showAdminToast("↩️ Cambios descartados.");
});

/* ══════════════════════════════════════════════════════
   🛒 14. CARRITO (idéntico al index.html público)
   ══════════════════════════════════════════════════════ */
let cart = [];
function addToCart(item) {
  const ex = cart.find(i => String(i.id) === String(item.id));
  if (ex) ex.qty++;
  else cart.push({ ...item, qty:1 });
  renderCart();
  showToast(`✅ ${item.name} reservado`);
  document.getElementById("cartDrawer").classList.add("open");
  document.getElementById("cartOverlay").classList.add("open");
}
function renderCart() {
  const body = document.getElementById("cartBody");
  const count = document.getElementById("cartCount");
  const total = document.getElementById("cartTotal");
  if (!cart.length) {
    body.innerHTML = `<div class="cart-empty"><span class="ei">🛍️</span>Tu carrito está vacío.<br/>¡Agrega algo increíble!</div>`;
    count.textContent = "0"; total.textContent = "RD$ 0"; return;
  }
  let t = 0, q = 0;
  body.innerHTML = cart.map((item, idx) => {
    t += item.price * item.qty; q += item.qty;
    return `<div class="cart-item">
      <img src="${resolveImgSrc(item.img)}" alt="${escAttr(item.name)}"/>
      <div class="cart-item-info">
        <div class="cart-item-name">${escHtml(item.name)}</div>
        <div class="cart-item-price">RD$ ${(item.price * item.qty).toLocaleString()}</div>
      </div>
      <div class="cart-item-controls">
        <button class="qty-btn" data-idx="${idx}" data-a="dec">−</button>
        <span class="cart-item-qty">${item.qty}</span>
        <button class="qty-btn" data-idx="${idx}" data-a="inc">+</button>
      </div>
    </div>`;
  }).join("");
  count.textContent = q;
  total.textContent = `RD$ ${t.toLocaleString()}`;
  document.querySelectorAll(".qty-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = parseInt(btn.dataset.idx);
      btn.dataset.a === "inc" ? cart[idx].qty++ : cart[idx].qty--;
      if (cart[idx].qty <= 0) cart.splice(idx, 1);
      renderCart();
    });
  });
}

/* ══════════════════════════════════════════════════════
   🧭 15. NAV, SPA, CARRITO — listeners generales
   ══════════════════════════════════════════════════════ */
function initGeneralUI() {
  document.getElementById("cartBtn").addEventListener("click", () => {
    document.getElementById("cartDrawer").classList.add("open");
    document.getElementById("cartOverlay").classList.add("open");
  });
  document.getElementById("cartClose").addEventListener("click", closeCart);
  document.getElementById("cartOverlay").addEventListener("click", closeCart);
  function closeCart() {
    document.getElementById("cartDrawer").classList.remove("open");
    document.getElementById("cartOverlay").classList.remove("open");
  }

  document.getElementById("btnWa").addEventListener("click", () => {
    if (!cart.length) { showToast("Carrito vacío"); return; }
    let msg = "🛍️ *Hola Tienda Perú! Quiero reservar:*\n\n";
    let t = 0;
    cart.forEach(i => { msg += `• ${i.name} x${i.qty} — RD$ ${(i.price*i.qty).toLocaleString()}\n`; t += i.price*i.qty; });
    msg += `\n*Total: RD$ ${t.toLocaleString()}*\n\n¿Me confirman disponibilidad? Paso a buscarlo en tienda 😊`;
    window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`, "_blank");
  });
  document.getElementById("btnMail").addEventListener("click", () => {
    if (!cart.length) { showToast("Carrito vacío"); return; }
    const EMAIL = "tiendaperuconstanza@gmail.com";
    let body = "Hola! Quiero reservar:\n\n";
    let t = 0;
    cart.forEach(i => { body += `- ${i.name} x${i.qty} — RD$ ${(i.price*i.qty).toLocaleString()}\n`; t += i.price*i.qty; });
    body += `\nTotal: RD$ ${t.toLocaleString()}\n\nPasaré a recogerlo en tienda. Gracias!`;
    window.location.href = `mailto:${EMAIL}?subject=Reserva - Tienda Perú&body=${encodeURIComponent(body)}`;
  });
  document.getElementById("btnClear").addEventListener("click", () => {
    if (confirm("¿Vaciar el carrito?")) { cart = []; renderCart(); }
  });

  document.getElementById("hamburger").addEventListener("click", () => {
    document.getElementById("mobileMenu").classList.toggle("open");
  });
  document.querySelectorAll(".mobile-menu a").forEach(a => {
    a.addEventListener("click", () => document.getElementById("mobileMenu").classList.remove("open"));
  });

  document.getElementById("contactForm").addEventListener("submit", e => {
    e.preventDefault();
    showToast("✅ Mensaje enviado. Te contactamos pronto!");
    e.target.reset();
  });

  document.getElementById("btnPriceFilter").addEventListener("click", () => applyFilter(getCurrentCat()));
  document.getElementById("btnPriceReset").addEventListener("click", () => {
    document.getElementById("priceMin").value = "";
    document.getElementById("priceMax").value = "";
    applyFilter(getCurrentCat());
  });
  ["priceMin","priceMax"].forEach(id => {
    document.getElementById(id).addEventListener("keydown", e => {
      if (e.key === "Enter") applyFilter(getCurrentCat());
    });
  });
}

function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 3000);
}

/* ── SISTEMA DE VISTAS SPA ── */
const VIEWS = ["inicio","categorias","productos","ofertas","nosotros","ubicacion","contacto"];
function showView(viewId) {
  if (!VIEWS.includes(viewId)) viewId = "inicio";
  document.querySelectorAll(".spa-view").forEach(el => el.classList.toggle("active", el.dataset.view === viewId));
  document.querySelectorAll(".qnav-btn").forEach(btn => btn.classList.toggle("active", btn.getAttribute("href") === `#${viewId}`));
  if (location.hash !== `#${viewId}`) history.replaceState(null, "", `#${viewId}`);
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
}
function handleHashChange() {
  const viewId = location.hash.replace("#", "") || "inicio";
  showView(viewId);
}
function initSpaNav() {
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    const href = link.getAttribute("href");
    if (!href || href === "#") return;
    link.addEventListener("click", e => {
      e.preventDefault();
      const viewId = href.slice(1);
      if (location.hash === href) showView(viewId);
      else location.hash = href;
      document.getElementById("mobileMenu").classList.remove("open");
    });
  });
  window.addEventListener("hashchange", handleHashChange);
  handleHashChange();
}

function animateCards() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.style.opacity="1"; e.target.style.transform="translateY(0)"; }
    });
  }, { threshold:0.06 });
  document.querySelectorAll(".product-card, .deal-card, .cat-pill").forEach(el => {
    el.style.opacity = "0"; el.style.transform = "translateY(20px)";
    el.style.transition = "opacity 0.5s ease, transform 0.5s ease, box-shadow 0.3s";
    obs.observe(el);
  });
}

/* ══════════════════════════════════════════════════════
   🚀 16. BOOTSTRAP
   ══════════════════════════════════════════════════════ */
async function bootstrapData() {
  await loadAll();
  applyConfigToDOM();
  bindConfigFields();
  renderCats();
  renderFilters();
  renderProducts();
  renderDeals();
  renderLibros();
  refreshPendingUI();
}

(async function init() {
  initLoginGate();
  initGeneralUI();
  initSpaNav();
  await bootstrapData();
})();
