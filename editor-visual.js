// ════════════════════════════════════════════════════════════
//  EDITOR VISUAL · Tienda Perú
//  Edición directa (contenteditable) sobre el diseño real de la
//  tienda, conectado a la colección Firestore "productos" (misma
//  colección y campos que usa admin.js).
// ════════════════════════════════════════════════════════════
import { db } from "./firebase-config.js";
import {
  collection, doc, onSnapshot, updateDoc, setDoc, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// ── SHORTCUTS DOM (mismo patrón que admin.js) ──
const $ = id => document.getElementById(id);
const grid          = $("productsGrid");
const loadingState  = $("loadingState");
const emptyState    = $("emptyState");
const prodCountLabel= $("prodCountLabel");
const statLoaded    = $("statLoaded");
const statPending   = $("statPending");
const btnSave       = $("btnSaveChanges");
const floatbar      = $("editorFloatbar");
const generalCard   = $("generalEditorCard");
const connStatus    = $("connStatus");

function setConnStatus(state) {
  if (!connStatus) return;
  connStatus.classList.remove("is-live", "is-error");
  if (state === "live") {
    connStatus.classList.add("is-live");
    connStatus.innerHTML = `<span class="conn-dot"></span>Conectado a Firestore`;
  } else if (state === "error") {
    connStatus.classList.add("is-error");
    connStatus.innerHTML = `<span class="conn-dot"></span>Error de conexión`;
  } else {
    connStatus.innerHTML = `<span class="conn-dot"></span>Conectando…`;
  }
}

// ── BADGES (reutilizado de index.html) ──
const BADGE_MAP = { new:["badge-new","Nuevo"], hot:["badge-hot","🔥 Popular"], sale:["badge-sale","Oferta"] };

// ── ESTADO ──
let firstLoad = true;
let originalData = {};   // id -> copia del documento tal cual está en Firestore
let pendingChanges = {}; // id -> { campoFirestore: nuevoValor, ... } (solo campos modificados)

// ── ESTADO · TEXTOS GENERALES ("configuracion/general") ──
let generalFirstLoad = true;
let generalOriginal = {};  // copia tal cual está en Firestore (o {} si el doc no existe aún)
let generalPending = {};   // { campoFirestore: nuevoValor, ... } (solo campos modificados)

// ════════════════════════════════════════════════════════════
//  CARGA EN TIEMPO REAL DESDE FIRESTORE (colección "productos")
// ════════════════════════════════════════════════════════════
const productsQuery = query(collection(db, "productos"), orderBy("name", "asc"));

onSnapshot(productsQuery, snap => {
  const products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  loadingState.style.display = "none";

  if (firstLoad) {
    firstLoad = false;
    originalData = {};
    products.forEach(p => { originalData[p.id] = clone(p); });
    renderGrid(products);
  } else {
    // Actualizaciones posteriores (p. ej. otro admin editando a la vez):
    // no se re-renderiza todo para no perder ediciones en curso del usuario.
    syncGrid(products);
  }

  emptyState.style.display = products.length ? "none" : "block";
  updateFloatbar(products.length);
  setConnStatus("live");
}, err => {
  console.error("Error cargando productos:", err);
  loadingState.textContent = "❌ No se pudieron cargar los productos. Revisa la consola.";
  setConnStatus("error");
});

// ════════════════════════════════════════════════════════════
//  CARGA EN TIEMPO REAL DESDE FIRESTORE (configuracion/general)
// ════════════════════════════════════════════════════════════
onSnapshot(doc(db, "configuracion", "general"), snap => {
  const data = snap.exists() ? snap.data() : {};

  if (generalFirstLoad) {
    generalFirstLoad = false;
    generalOriginal = clone(data);
    renderGeneralFields(data);
    attachGeneralListeners();
  } else {
    syncGeneralFields(data);
  }
}, err => {
  console.error("Error cargando textos generales:", err);
  showToast("❌ No se pudieron cargar los textos generales", "error");
  setConnStatus("error");
});

// Pinta el valor guardado (o "" si el campo aún no existe) en cada campo editable
function renderGeneralFields(data) {
  generalCard.querySelectorAll("[data-field]").forEach(el => {
    el.textContent = data[el.dataset.field] ?? "";
  });
}

// Igual que syncGrid: refresca solo lo que el usuario no está editando ni tiene pendiente
function syncGeneralFields(data) {
  generalCard.querySelectorAll("[data-field]").forEach(el => {
    const field = el.dataset.field;
    const isDirty = Object.prototype.hasOwnProperty.call(generalPending, field);
    const isFocused = document.activeElement === el;
    const incoming = data[field] ?? "";
    if (!isDirty && !isFocused && el.textContent.trim() !== String(incoming)) {
      el.textContent = incoming;
    }
  });
  generalOriginal = clone(data);
}

function attachGeneralListeners() {
  generalCard.addEventListener("input", e => {
    if (!e.target.matches("[data-field]")) return;
    handleGeneralFieldChange(e.target);
  });
  generalCard.addEventListener("focusout", e => {
    if (!e.target.matches("[data-field]")) return;
    handleGeneralFieldChange(e.target);
  });
}

function handleGeneralFieldChange(el) {
  const field = el.dataset.field;
  const newVal = el.textContent.trim();
  const originalVal = String(generalOriginal[field] ?? "").trim();

  if (newVal === originalVal) {
    delete generalPending[field];
  } else {
    generalPending[field] = newVal;
  }

  el.classList.toggle("field-dirty", Object.prototype.hasOwnProperty.call(generalPending, field));
  updateFloatbar();
}

// ════════════════════════════════════════════════════════════
//  RENDER INICIAL DEL GRID
// ════════════════════════════════════════════════════════════
function renderGrid(products) {
  grid.innerHTML = products.map(buildProductCard).join("");
  attachEditableListeners();
}

// Sincroniza el grid con nuevos datos remotos sin pisar ediciones en curso
function syncGrid(products) {
  const incomingIds = new Set(products.map(p => p.id));

  // Eliminar tarjetas de productos borrados remotamente
  Object.keys(originalData).forEach(id => {
    if (!incomingIds.has(id)) {
      const card = grid.querySelector(`.product-card[data-id="${cssEscape(id)}"]`);
      if (card) card.remove();
      delete originalData[id];
      delete pendingChanges[id];
    }
  });

  products.forEach(p => {
    const existingCard = grid.querySelector(`.product-card[data-id="${cssEscape(p.id)}"]`);

    if (!existingCard) {
      // Producto nuevo (creado desde el panel admin, por ejemplo): agregarlo al final
      originalData[p.id] = clone(p);
      grid.insertAdjacentHTML("beforeend", buildProductCard(p));
      attachEditableListeners(grid.querySelector(`.product-card[data-id="${cssEscape(p.id)}"]`));
      return;
    }

    // Producto existente: solo refrescar campos que el usuario NO está editando
    // ni tiene ya modificados localmente sin guardar.
    const dirty = pendingChanges[p.id] || {};
    ["name", "desc"].forEach(field => {
      const el = existingCard.querySelector(`[data-field="${field}"]`);
      if (!el) return;
      const isDirty = Object.prototype.hasOwnProperty.call(dirty, field);
      const isFocused = document.activeElement === el;
      if (!isDirty && !isFocused && el.textContent.trim() !== String(p[field] ?? "")) {
        el.textContent = p[field] ?? "";
      }
    });
    const priceEl = existingCard.querySelector('[data-field="price"]');
    if (priceEl) {
      const isDirty = Object.prototype.hasOwnProperty.call(dirty, "price");
      const isFocused = document.activeElement === priceEl;
      if (!isDirty && !isFocused) {
        priceEl.textContent = formatPriceForEdit(p);
      }
    }

    originalData[p.id] = clone(p);
  });
}

// ════════════════════════════════════════════════════════════
//  PLANTILLA DE TARJETA (reutiliza el diseño de .product-card
//  de index.html; solo nombre, descripción y precio son editables)
// ════════════════════════════════════════════════════════════
function buildProductCard(p) {
  const badgesHtml = (p.badges || [])
    .map(b => BADGE_MAP[b] ? `<span class="badge ${BADGE_MAP[b][0]}">${BADGE_MAP[b][1]}</span>` : "")
    .join("");

  return `
    <div class="product-card" data-id="${esc(p.id)}">
      <div class="product-img-wrap">
        <img src="${esc(p.img || "")}" alt="${esc(p.name || "")}" loading="lazy"/>
        <div class="product-badges">${badgesHtml}</div>
      </div>
      <div class="product-info">
        <div class="product-cat">${esc(p.cat || "sin categoría")}</div>

        <div class="product-name editable-field" contenteditable="true"
             data-field="name" data-id="${esc(p.id)}" spellcheck="false">${esc(p.name || "")}</div>

        <div class="product-desc editable-field" contenteditable="true"
             data-field="desc" data-id="${esc(p.id)}" spellcheck="false">${esc(p.desc || "")}</div>

        <div class="product-footer">
          <div class="product-price">
            <span class="price-label">Precio (RD$)</span>
            <span class="price-value">
              <span class="cur">RD$</span>
              <span class="editable-field price-editable" contenteditable="true"
                    data-field="price" data-id="${esc(p.id)}" spellcheck="false">${formatPriceForEdit(p)}</span>
            </span>
          </div>
        </div>
      </div>
    </div>`;
}

// Texto mostrado inicialmente en el campo de precio editable
function formatPriceForEdit(p) {
  if (p.price === 0 || p.price == null) return "Consultar";
  const val = (p.priceType === "range" || (p.priceMin != null && p.priceMax != null))
    ? (p.priceMin ?? p.minPrice ?? p.price)
    : p.price;
  return String(val);
}

// ════════════════════════════════════════════════════════════
//  DETECCIÓN DE CAMBIOS SOBRE LOS CAMPOS CONTENTEDITABLE
// ════════════════════════════════════════════════════════════
function attachEditableListeners(scope = grid) {
  // Delegación de eventos: funciona tanto en la carga inicial como
  // en tarjetas agregadas dinámicamente después.
  if (scope === grid && grid.dataset.listenersAttached) return;
  if (scope === grid) grid.dataset.listenersAttached = "1";

  const target = scope === grid ? grid : scope;

  target.addEventListener("input", e => {
    const el = e.target;
    if (!el.matches("[data-field]")) return;
    handleFieldChange(el);
  });

  target.addEventListener("focusout", e => {
    const el = e.target;
    if (!el.matches("[data-field]")) return;
    if (el.dataset.field === "price") normalizePriceField(el);
    handleFieldChange(el);
  });

  target.addEventListener("focusin", e => {
    const el = e.target;
    if (el.matches('[data-field="price"]')) selectAllText(el);
  });

  target.addEventListener("keydown", e => {
    const el = e.target;
    if (!el.matches("[data-field]")) return;
    // Nombre y precio son de una sola línea: Enter confirma y quita el foco
    if (el.dataset.field !== "desc" && e.key === "Enter") {
      e.preventDefault();
      el.blur();
    }
  });
}

function selectAllText(el) {
  const range = document.createRange();
  range.selectNodeContents(el);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}

// Convierte el texto libre del campo de precio en un número usable
function normalizePriceField(el) {
  const raw = el.textContent.trim();
  const id = el.dataset.id;
  const original = originalData[id];
  if (!original) return;

  // Si el usuario deja el texto "Consultar" (o vacío) tal cual, se respeta
  if (raw === "" || /^consultar$/i.test(raw)) {
    el.textContent = "Consultar";
    return;
  }

  const numeric = parseFloat(raw.replace(/[^\d.]/g, ""));
  if (isNaN(numeric)) {
    // Valor no interpretable: revertir a lo que había antes de editar
    el.textContent = formatPriceForEdit(original);
    return;
  }
  el.textContent = String(numeric);
}

function handleFieldChange(el) {
  const id = el.dataset.id;
  const field = el.dataset.field;
  const original = originalData[id];
  if (!original) return;

  if (field === "price") {
    const raw = el.textContent.trim();
    const isConsult = raw === "" || /^consultar$/i.test(raw);
    const newPrice = isConsult ? 0 : (parseFloat(raw.replace(/[^\d.]/g, "")) || 0);

    const originalIsConsult = original.price === 0 || original.price == null;
    const originalEffective = originalIsConsult ? 0 : (original.priceMin ?? original.price);

    if (newPrice === originalEffective) {
      unsetPending(id, "price");
      unsetPending(id, "priceMin");
    } else {
      setPending(id, "price", newPrice);
      // Si el producto es de precio variable, mantenemos priceMin sincronizado
      // con el nuevo precio (priceMax no se toca: no es un campo editable aquí).
      if (original.priceType === "range" || (original.priceMin != null && original.priceMax != null)) {
        setPending(id, "priceMin", newPrice);
      }
    }
  } else {
    const newVal = el.textContent.trim();
    const originalVal = String(original[field] ?? "").trim();
    if (newVal === originalVal) {
      unsetPending(id, field);
    } else {
      setPending(id, field, newVal);
    }
  }

  updateCardDirtyState(id);
  updateFloatbar();
}

function setPending(id, field, value) {
  if (!pendingChanges[id]) pendingChanges[id] = {};
  pendingChanges[id][field] = value;
}
function unsetPending(id, field) {
  if (!pendingChanges[id]) return;
  delete pendingChanges[id][field];
  if (Object.keys(pendingChanges[id]).length === 0) delete pendingChanges[id];
}

function updateCardDirtyState(id) {
  const card = grid.querySelector(`.product-card[data-id="${cssEscape(id)}"]`);
  if (!card) return;
  const isDirty = !!pendingChanges[id];
  card.classList.toggle("is-dirty", isDirty);

  ["name", "desc", "price"].forEach(field => {
    const el = card.querySelector(`[data-field="${field}"]`);
    if (!el) return;
    const fieldDirty = !!(pendingChanges[id] && Object.prototype.hasOwnProperty.call(pendingChanges[id], field === "price" ? "price" : field));
    el.classList.toggle("field-dirty", fieldDirty);
  });
}

// ════════════════════════════════════════════════════════════
//  BARRA FLOTANTE
// ════════════════════════════════════════════════════════════
function updateFloatbar(totalLoaded) {
  const total = totalLoaded ?? Object.keys(originalData).length;
  const pendingCount = Object.keys(pendingChanges).length + (Object.keys(generalPending).length ? 1 : 0);

  statLoaded.textContent = total;
  statPending.textContent = pendingCount;
  prodCountLabel.textContent = `${total} producto${total !== 1 ? "s" : ""}`;

  btnSave.disabled = pendingCount === 0;
  floatbar.classList.toggle("has-pending", pendingCount > 0);
}

// ════════════════════════════════════════════════════════════
//  GUARDAR CAMBIOS — updateDoc() solo de productos/campos modificados
// ════════════════════════════════════════════════════════════
btnSave.addEventListener("click", saveChanges);

async function saveChanges() {
  const ids = Object.keys(pendingChanges);
  const hasGeneralChanges = Object.keys(generalPending).length > 0;
  if (!ids.length && !hasGeneralChanges) return;

  btnSave.disabled = true;
  const originalLabel = btnSave.textContent;
  btnSave.textContent = "Guardando…";

  let okCount = 0;
  let errCount = 0;

  for (const id of ids) {
    const changes = pendingChanges[id];
    try {
      await updateDoc(doc(db, "productos", id), changes);
      // Sincronizar el estado local con lo recién guardado
      originalData[id] = { ...originalData[id], ...changes };
      delete pendingChanges[id];
      updateCardDirtyState(id);
      okCount++;
    } catch (err) {
      console.error(`Error guardando producto ${id}:`, err);
      errCount++;
    }
  }

  // Textos generales: un solo documento, se guarda con setDoc(merge:true)
  // por si el documento "configuracion/general" todavía no existe en Firestore.
  if (hasGeneralChanges) {
    try {
      await setDoc(doc(db, "configuracion", "general"), generalPending, { merge: true });
      generalOriginal = { ...generalOriginal, ...generalPending };
      generalCard.querySelectorAll("[data-field].field-dirty").forEach(el => el.classList.remove("field-dirty"));
      generalPending = {};
      okCount++;
    } catch (err) {
      console.error("Error guardando textos generales:", err);
      errCount++;
    }
  }

  btnSave.textContent = originalLabel;
  updateFloatbar();

  if (errCount === 0) {
    showToast(`✅ ${okCount} cambio${okCount !== 1 ? "s" : ""} guardado${okCount !== 1 ? "s" : ""}`, "success");
  } else if (okCount === 0) {
    showToast(`❌ No se pudo guardar (${errCount} error${errCount !== 1 ? "es" : ""})`, "error");
  } else {
    showToast(`⚠️ ${okCount} guardado(s), ${errCount} con error`, "error");
  }
}

// ════════════════════════════════════════════════════════════
//  TOAST (mismo patrón que admin.js)
// ════════════════════════════════════════════════════════════
function showToast(msg, type = "") {
  const t = $("toast");
  t.textContent = msg;
  t.className = "toast show " + type;
  setTimeout(() => t.classList.remove("show"), 3000);
}

// ════════════════════════════════════════════════════════════
//  HELPERS
// ════════════════════════════════════════════════════════════
function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

function esc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Escapa un id para usarlo de forma segura en selectores CSS (querySelector)
function cssEscape(id) {
  return String(id).replace(/([^a-zA-Z0-9_-])/g, "\\$1");
}
