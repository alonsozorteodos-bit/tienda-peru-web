// ════════════════════════════════════════════════════════════
//  PANEL ADMIN · Tienda Perú
//  Autenticación + CRUD + Subida de imágenes a Firebase Storage
// ════════════════════════════════════════════════════════════
import { db, auth, storage } from "./firebase-config.js";

import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

import { 
  collection, doc, getDocs, getDoc, 
  addDoc, setDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy 
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

import { 
  ref as storageRef, 
  uploadBytes, 
  getDownloadURL 
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";
// ── ESTADO ──
let PRODUCTS = [];
let CATS = [];
let DEALS = [];
let currentTab = "productos";

// ── SHORTCUTS DOM ──
const $ = id => document.getElementById(id);
const loginScreen = $("loginScreen");
const dashboard = $("dashboard");

// ════════════════════════════════════════════════════════════
//  AUTENTICACIÓN
// ════════════════════════════════════════════════════════════
$("loginForm").addEventListener("submit", async e => {
  e.preventDefault();
  $("loginError").classList.remove("show");
  $("loginLoading").classList.add("show");
  try {
    await signInWithEmailAndPassword(auth, $("loginEmail").value, $("loginPass").value);
  } catch (err) {
    $("loginError").classList.add("show");
  } finally {
    $("loginLoading").classList.remove("show");
  }
});

$("btnLogout").addEventListener("click", async () => {
  await signOut(auth);
});

onAuthStateChanged(auth, user => {
  if (user) {
    loginScreen.classList.add("hidden");
    dashboard.classList.add("show");
    $("userEmail").textContent = user.email;
    initSubscriptions();
  } else {
    loginScreen.classList.remove("hidden");
    dashboard.classList.remove("show");
    $("loginForm").reset();
  }
});

// ════════════════════════════════════════════════════════════
//  SUSCRIPCIONES EN TIEMPO REAL
// ════════════════════════════════════════════════════════════
let subscriptionsStarted = false;
function initSubscriptions() {
  if (subscriptionsStarted) return;
  subscriptionsStarted = true;

  onSnapshot(query(collection(db, "productos"), orderBy("name", "asc")), snap => {
    PRODUCTS = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    $("statProducts").textContent = PRODUCTS.length;
    if (currentTab === "productos") renderProductsTable();
  });

  onSnapshot(collection(db, "categorias"), snap => {
    CATS = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    $("statCats").textContent = CATS.length;
    if (currentTab === "categorias") renderCatsTable();
  });

  onSnapshot(collection(db, "ofertas"), snap => {
    DEALS = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    $("statDeals").textContent = DEALS.length;
    if (currentTab === "ofertas") renderDealsTable();
  });
}

// ════════════════════════════════════════════════════════════
//  NAVEGACIÓN DE PESTAÑAS
// ════════════════════════════════════════════════════════════
document.querySelectorAll(".nav-item").forEach(btn => {
  btn.addEventListener("click", () => switchTab(btn.dataset.tab));
});

function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
  document.querySelectorAll(".tab-panel").forEach(p => p.classList.toggle("active", p.dataset.panel === tab));
  const titles = { productos:"Productos", categorias:"Categorías", ofertas:"Ofertas" };
  $("topbarTitle").textContent = titles[tab] || tab;
  if (tab === "productos") renderProductsTable();
  if (tab === "categorias") renderCatsTable();
  if (tab === "ofertas") renderDealsTable();
  // cerrar sidebar en móvil
  $("sidebar").classList.remove("open");
}

// ════════════════════════════════════════════════════════════
//  RENDER TABLAS
// ════════════════════════════════════════════════════════════
function renderProductsTable() {
  const tbody = $("productsTableBody");
  if (!PRODUCTS.length) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><span class="ei">📦</span>No hay productos. Crea el primero.</div></td></tr>`;
    return;
  }
  tbody.innerHTML = PRODUCTS.map(p => {
    const priceText = p.price === 0
      ? '<span style="color:var(--red);font-weight:600;">Consulta</span>'
      : (p.priceType === "range" || (p.priceMin != null && p.priceMax != null))
        ? `RD$ ${(p.priceMin ?? p.minPrice ?? 0).toLocaleString()} — ${(p.priceMax ?? p.maxPrice ?? 0).toLocaleString()}`
        : `RD$ ${(p.price ?? 0).toLocaleString()}`;
    const badges = (p.badges || []).map(b => `<span class="cat-badge">${esc(b)}</span>`).join(" ") || "—";
    return `<tr>
      <td><div class="row-img-wrap"><img class="row-img" src="${p.img || ""}" alt=""/><div>${esc(p.name)}</div></div></td>
      <td><span class="cat-badge">${esc(p.cat || "—")}</span></td>
      <td>${priceText}</td>
      <td>${badges}</td>
      <td><div class="row-actions">
        <button class="btn-icon btn-edit" data-edit="${p.id}" title="Editar">✏️</button>
        <button class="btn-icon btn-del"  data-del="${p.id}"  title="Eliminar">🗑️</button>
      </div></td>
    </tr>`;
  }).join("");

  tbody.querySelectorAll('[data-edit]').forEach(b => b.addEventListener("click", () => openProductModal(b.dataset.edit)));
  tbody.querySelectorAll('[data-del]').forEach(b => b.addEventListener("click", () => confirmDelete("productos", b.dataset.del, "el producto")));
}

function renderCatsTable() {
  const tbody = $("catsTableBody");
  if (!CATS.length) {
    tbody.innerHTML = `<tr><td colspan="4"><div class="empty-state"><span class="ei">📦</span>No hay categorías.</div></td></tr>`;
    return;
  }
  tbody.innerHTML = CATS.map(c => `<tr>
    <td><img class="row-img" src="${c.img || ""}" alt="" style="${c.img?"":"display:none;"}"/>${c.img?"":'<span style="font-size:1.5rem;">'+esc(c.icon||"📦")+'</span>'}</td>
    <td><strong>${esc(c.name)}</strong></td>
    <td><code style="font-size:0.75rem;color:var(--text3);">${esc(c.id)}</code></td>
    <td><div class="row-actions">
      <button class="btn-icon btn-edit" data-edit="${c.id}" title="Editar">✏️</button>
      <button class="btn-icon btn-del"  data-del="${c.id}"  title="Eliminar">🗑️</button>
    </div></td>
  </tr>`).join("");

  tbody.querySelectorAll('[data-edit]').forEach(b => b.addEventListener("click", () => openCatModal(b.dataset.edit)));
  tbody.querySelectorAll('[data-del]').forEach(b => b.addEventListener("click", () => confirmDelete("categorias", b.dataset.del, "la categoría")));
}

function renderDealsTable() {
  const tbody = $("dealsTableBody");
  if (!DEALS.length) {
    tbody.innerHTML = `<tr><td colspan="4"><div class="empty-state"><span class="ei">⚡</span>No hay ofertas.</div></td></tr>`;
    return;
  }
  tbody.innerHTML = DEALS.map(d => `<tr>
    <td><div class="row-img-wrap"><img class="row-img" src="${d.img || ""}" alt=""/><div>${esc(d.name)}</div></div></td>
    <td><strong>RD$ ${(d.price ?? 0).toLocaleString()}</strong></td>
    <td><span class="cat-badge">${esc(d.badge || "Oferta")}</span></td>
    <td><div class="row-actions">
      <button class="btn-icon btn-edit" data-edit="${d.id}" title="Editar">✏️</button>
      <button class="btn-icon btn-del"  data-del="${d.id}"  title="Eliminar">🗑️</button>
    </div></td>
  </tr>`).join("");

  tbody.querySelectorAll('[data-edit]').forEach(b => b.addEventListener("click", () => openDealModal(b.dataset.edit)));
  tbody.querySelectorAll('[data-del]').forEach(b => b.addEventListener("click", () => confirmDelete("ofertas", b.dataset.del, "la oferta")));
}

// ════════════════════════════════════════════════════════════
//  BOTONES "NUEVO"
// ════════════════════════════════════════════════════════════
$("btnNewProduct").addEventListener("click", () => openProductModal(null));
$("btnNewCat").addEventListener("click", () => openCatModal(null));
$("btnNewDeal").addEventListener("click", () => openDealModal(null));

// ════════════════════════════════════════════════════════════
//  MODAL: PRODUCTOS
// ════════════════════════════════════════════════════════════
function openProductModal(id) {
  const p = id ? PRODUCTS.find(x => x.id === id) : null;
  $("modalTitle").textContent = p ? "Editar producto" : "Nuevo producto";

  const catOptions = CATS.map(c => `<option value="${esc(c.id)}" ${p && p.cat===c.id?"selected":""}>${esc(c.name)}</option>`).join("");

  $("modalBody").innerHTML = `
    <div class="form-group">
      <label>Imagen del producto</label>
      <div class="upload-area" id="uploadArea">
        ${p && p.img ? `<img src="${p.img}" alt=""/>` : `<span class="upload-icon">📷</span><div class="upload-text">Haz clic para subir una imagen</div><div class="upload-hint">JPG, PNG · máx 5MB</div>`}
      </div>
      <input type="file" id="imgFile" accept="image/*" style="display:none;"/>
      <div class="upload-progress" id="uploadProgress"><div class="upload-progress-bar" id="uploadBar"></div></div>
      <div class="url-input-row">
        <input type="text" id="imgUrl" placeholder="O pega una URL de imagen" value="${p?p.img:""}" style="flex:1;padding:9px 12px;border:1.5px solid var(--gray2);border-radius:8px;font-size:0.78rem;"/>
      </div>
    </div>
    <div class="form-group">
      <label>Nombre del producto</label>
      <input type="text" id="pName" value="${p?esc(p.name):""}" placeholder="Ej: Reloj clásico dorado" required/>
    </div>
    <div class="form-group">
      <label>Descripción</label>
      <textarea id="pDesc" placeholder="Descripción del producto...">${p?esc(p.desc||""):""}</textarea>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Categoría</label>
        <select id="pCat">
          <option value="">— Selecciona —</option>
          ${catOptions}
        </select>
      </div>
      <div class="form-group">
        <label>Tipo de precio</label>
        <select id="pPriceType">
          <option value="fixed" ${!p||p.priceType!=="range"?"selected":""}>Precio fijo</option>
          <option value="range" ${p&&p.priceType==="range"?"selected":""}>Precio variable (rango)</option>
          <option value="consult" ${p&&p.price===0?"selected":""}>Consultar (personalizado)</option>
        </select>
      </div>
    </div>
    <div class="form-row" id="priceFixedRow">
      <div class="form-group">
        <label>Precio (RD$)</label>
        <input type="number" id="pPrice" value="${p&&p.price? p.price : ""}" placeholder="0" min="0"/>
      </div>
      <div class="form-group"></div>
    </div>
    <div class="form-row" id="priceRangeRow" style="display:none;">
      <div class="form-group">
        <label>Precio mínimo (RD$)</label>
        <input type="number" id="pPriceMin" value="${p?(p.priceMin??p.minPrice??""):""}" placeholder="0" min="0"/>
      </div>
      <div class="form-group">
        <label>Precio máximo (RD$)</label>
        <input type="number" id="pPriceMax" value="${p?(p.priceMax??p.maxPrice??""):""}" placeholder="0" min="0"/>
      </div>
    </div>
    <div class="form-group">
      <label>Badges (etiquetas)</label>
      <div class="badge-checks">
        <label class="badge-check"><input type="checkbox" id="bNew" ${p&&(p.badges||[]).includes("new")?"checked":""}/> Nuevo</label>
        <label class="badge-check"><input type="checkbox" id="bHot" ${p&&(p.badges||[]).includes("hot")?"checked":""}/> Popular</label>
        <label class="badge-check"><input type="checkbox" id="bSale" ${p&&(p.badges||[]).includes("sale")?"checked":""}/> Oferta</label>
      </div>
    </div>
  `;

  $("modalFoot").innerHTML = `
    <button class="btn-secondary" id="btnCancel">Cancelar</button>
    <button class="btn-save" id="btnSaveProduct">${p?"Guardar cambios":"Crear producto"}</button>
  `;

  // Lógica de tipo de precio
  const priceTypeSel = $("pPriceType");
  function togglePriceRows() {
    const v = priceTypeSel.value;
    $("priceFixedRow").style.display = v === "fixed" ? "grid" : "none";
    $("priceRangeRow").style.display = v === "range" ? "grid" : "none";
  }
  priceTypeSel.addEventListener("change", togglePriceRows);
  if (p && p.priceType === "range") priceTypeSel.value = "range";
  if (p && p.price === 0) priceTypeSel.value = "consult";
  togglePriceRows();

  // Upload de imagen (Límite 5 MB)
  const uploadArea = $("uploadArea");
  const imgFile = $("imgFile");
  let uploadedUrl = p ? p.img : "";

  uploadArea.addEventListener("click", () => imgFile.click());
  imgFile.addEventListener("change", async e => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast("La imagen pesa más de 5MB", "error"); return; }
    try {
      $("uploadProgress").classList.add("show");
      $("uploadBar").style.width = "30%";
      const path = `productos/${Date.now()}_${file.name}`;
      const ref = storageRef(storage, path);
      const snap = await uploadBytes(ref, file);
      $("uploadBar").style.width = "80%";
      const url = await getDownloadURL(snap.ref);
      uploadedUrl = url;
      $("imgUrl").value = url;
      $("uploadBar").style.width = "100%";
      uploadArea.classList.add("has-img");
      uploadArea.innerHTML = `<img src="${url}" alt=""/>`;
      setTimeout(() => $("uploadProgress").classList.remove("show"), 800);
      showToast("Imagen subida");
    } catch (err) {
      $("uploadProgress").classList.remove("show");
      showToast("Error al subir imagen", "error");
    }
  });

  $("btnCancel").addEventListener("click", closeModal);
  $("btnSaveProduct").addEventListener("click", () => saveProduct(id));
  openModal();
}

async function saveProduct(id) {
  const name = $("pName").value.trim();
  if (!name) { showToast("El nombre es obligatorio", "error"); return; }

  const priceType = $("pPriceType").value;
  let data = {
    name,
    desc: $("pDesc").value.trim(),
    cat: $("pCat").value,
    badges: [
      $("bNew").checked ? "new" : null,
      $("bHot").checked ? "hot" : null,
      $("bSale").checked ? "sale" : null
    ].filter(Boolean),
    img: $("imgUrl").value.trim() || uploadedImgUrl()
  };

  if (priceType === "consult") {
    data.price = 0;
    data.priceType = "fixed";
  } else if (priceType === "range") {
    data.priceType = "range";
    data.priceMin = parseFloat($("pPriceMin").value) || 0;
    data.priceMax = parseFloat($("pPriceMax").value) || 0;
    data.price = data.priceMin;
  } else {
    data.priceType = "fixed";
    data.price = parseFloat($("pPrice").value) || 0;
  }

  try {
    $("btnSaveProduct").disabled = true;
    if (id) {
      await updateDoc(doc(db, "productos", id), data);
      showToast("Producto actualizado", "success");
    } else {
      await addDoc(collection(db, "productos"), data);
      showToast("Producto creado", "success");
    }
    closeModal();
  } catch (err) {
    showToast("Error al guardar", "error");
    $("btnSaveProduct").disabled = false;
  }
}

let uploadedImgUrl = () => "";

// ════════════════════════════════════════════════════════════
//  MODAL: CATEGORÍAS
// ════════════════════════════════════════════════════════════
function openCatModal(id) {
  const c = id ? CATS.find(x => x.id === id) : null;
  $("modalTitle").textContent = c ? "Editar categoría" : "Nueva categoría";

  $("modalBody").innerHTML = `
    <div class="form-group">
      <label>Imagen de la categoría (opcional)</label>
      <div class="upload-area" id="uploadArea">
        ${c && c.img ? `<img src="${c.img}" alt=""/>` : `<span class="upload-icon">📷</span><div class="upload-text">Haz clic para subir una imagen</div>`}
      </div>
      <input type="file" id="imgFile" accept="image/*" style="display:none;"/>
      <div class="upload-progress" id="uploadProgress"><div class="upload-progress-bar" id="uploadBar"></div></div>
      <div class="url-input-row">
        <input type="text" id="imgUrl" placeholder="O pega una URL de imagen" value="${c?c.img:""}" style="flex:1;padding:9px 12px;border:1.5px solid var(--gray2);border-radius:8px;font-size:0.78rem;"/>
      </div>
    </div>
    <div class="form-group">
      <label>Nombre de la categoría</label>
      <input type="text" id="cName" value="${c?esc(c.name):""}" placeholder="Ej: Joyería & Bisutería" required/>
    </div>
    <div class="form-group">
      <label>ID / Slug (sin espacios, en minúsculas)</label>
      <input type="text" id="cSlug" value="${c?esc(c.id):""}" placeholder="Ej: joyeria" ${c?"readonly":""} required/>
      <div class="form-hint">Este ID se usa para filtrar productos. No se puede cambiar después.</div>
    </div>
    <div class="form-group">
      <label>Icono (emoji) — si no hay imagen</label>
      <input type="text" id="cIcon" value="${c?esc(c.icon||""):""}" placeholder="Ej: 💎" maxlength="4"/>
    </div>
  `;

  $("modalFoot").innerHTML = `
    <button class="btn-secondary" id="btnCancel">Cancelar</button>
    <button class="btn-save" id="btnSaveCat">${c?"Guardar cambios":"Crear categoría"}</button>
  `;

  // Upload (Límite 5 MB)
  const uploadArea = $("uploadArea");
  const imgFile = $("imgFile");
  uploadArea.addEventListener("click", () => imgFile.click());
  imgFile.addEventListener("change", async e => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast("La imagen pesa más de 5MB", "error"); return; }
    try {
      $("uploadProgress").classList.add("show");
      $("uploadBar").style.width = "30%";
      const path = `categorias/${Date.now()}_${file.name}`;
      const ref = storageRef(storage, path);
      const snap = await uploadBytes(ref, file);
      $("uploadBar").style.width = "80%";
      const url = await getDownloadURL(snap.ref);
      $("imgUrl").value = url;
      $("uploadBar").style.width = "100%";
      uploadArea.classList.add("has-img");
      uploadArea.innerHTML = `<img src="${url}" alt=""/>`;
      setTimeout(() => $("uploadProgress").classList.remove("show"), 800);
      showToast("Imagen subida");
    } catch (err) {
      $("uploadProgress").classList.remove("show");
      showToast("Error al subir imagen", "error");
    }
  });

  $("btnCancel").addEventListener("click", closeModal);
  $("btnSaveCat").addEventListener("click", () => saveCat(c ? c.id : null));
  openModal();
}

async function saveCat(id) {
  const name = $("cName").value.trim();
  const slug = $("cSlug").value.trim().toLowerCase().replace(/\s+/g, "-");
  if (!name || !slug) { showToast("Nombre e ID son obligatorios", "error"); return; }

  const data = {
    name,
    icon: $("cIcon").value.trim() || "📦",
    img: $("imgUrl").value.trim() || ""
  };

  try {
    $("btnSaveCat").disabled = true;
    if (id) {
      await updateDoc(doc(db, "categorias", id), data);
      showToast("Categoría actualizada", "success");
    } else {
      const existing = await getDoc(doc(db, "categorias", slug));
      if (existing.exists()) { showToast("Ya existe una categoría con ese ID", "error"); $("btnSaveCat").disabled = false; return; }
      await setDoc(doc(db, "categorias", slug), data);
      showToast("Categoría creada", "success");
    }
    closeModal();
  } catch (err) {
    showToast("Error al guardar", "error");
    $("btnSaveCat").disabled = false;
  }
}

// ════════════════════════════════════════════════════════════
//  MODAL: OFERTAS
// ════════════════════════════════════════════════════════════
function openDealModal(id) {
  const d = id ? DEALS.find(x => x.id === id) : null;
  $("modalTitle").textContent = d ? "Editar oferta" : "Nueva oferta";

  $("modalBody").innerHTML = `
    <div class="form-group">
      <label>Imagen de la oferta</label>
      <div class="upload-area" id="uploadArea">
        ${d && d.img ? `<img src="${d.img}" alt=""/>` : `<span class="upload-icon">📷</span><div class="upload-text">Haz clic para subir una imagen</div>`}
      </div>
      <input type="file" id="imgFile" accept="image/*" style="display:none;"/>
      <div class="upload-progress" id="uploadProgress"><div class="upload-progress-bar" id="uploadBar"></div></div>
      <div class="url-input-row">
        <input type="text" id="imgUrl" placeholder="O pega una URL de imagen" value="${d?d.img:""}" style="flex:1;padding:9px 12px;border:1.5px solid var(--gray2);border-radius:8px;font-size:0.78rem;"/>
      </div>
    </div>
    <div class="form-group">
      <label>Nombre de la oferta</label>
      <input type="text" id="dName" value="${d?esc(d.name):""}" placeholder="Ej: Aretes minimalistas" required/>
    </div>
    <div class="form-group">
      <label>Descripción corta</label>
      <textarea id="dDesc" placeholder="Descripción breve...">${d?esc(d.desc||""):""}</textarea>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Precio (RD$)</label>
        <input type="number" id="dPrice" value="${d?d.price:""}" placeholder="0" min="0" required/>
      </div>
      <div class="form-group">
        <label>Badge / Etiqueta</label>
        <input type="text" id="dBadge" value="${d?esc(d.badge||""):""}" placeholder="Ej: Oferta, Nuevo, -50%"/>
      </div>
    </div>
  `;

  $("modalFoot").innerHTML = `
    <button class="btn-secondary" id="btnCancel">Cancelar</button>
    <button class="btn-save" id="btnSaveDeal">${d?"Guardar cambios":"Crear oferta"}</button>
  `;

  // Upload (Límite 5 MB)
  const uploadArea = $("uploadArea");
  const imgFile = $("imgFile");
  uploadArea.addEventListener("click", () => imgFile.click());
  imgFile.addEventListener("change", async e => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast("La imagen pesa más de 5MB", "error"); return; }
    try {
      $("uploadProgress").classList.add("show");
      $("uploadBar").style.width = "30%";
      const path = `ofertas/${Date.now()}_${file.name}`;
      const ref = storageRef(storage, path);
      const snap = await uploadBytes(ref, file);
      $("uploadBar").style.width = "80%";
      const url = await getDownloadURL(snap.ref);
      $("imgUrl").value = url;
      $("uploadBar").style.width = "100%";
      uploadArea.classList.add("has-img");
      uploadArea.innerHTML = `<img src="${url}" alt=""/>`;
      setTimeout(() => $("uploadProgress").classList.remove("show"), 800);
      showToast("Imagen subida");
    } catch (err) {
      $("uploadProgress").classList.remove("show");
      showToast("Error al subir imagen", "error");
    }
  });

  $("btnCancel").addEventListener("click", closeModal);
  $("btnSaveDeal").addEventListener("click", () => saveDeal(d ? d.id : null));
  openModal();
}

async function saveDeal(id) {
  const name = $("dName").value.trim();
  const price = parseFloat($("dPrice").value);
  if (!name || isNaN(price)) { showToast("Nombre y precio son obligatorios", "error"); return; }

  const data = {
    name,
    desc: $("dDesc").value.trim(),
    price,
    badge: $("dBadge").value.trim() || "Oferta",
    img: $("imgUrl").value.trim() || ""
  };

  try {
    $("btnSaveDeal").disabled = true;
    if (id) {
      await updateDoc(doc(db, "ofertas", id), data);
      showToast("Oferta actualizada", "success");
    } else {
      await addDoc(collection(db, "ofertas"), data);
      showToast("Oferta creada", "success");
    }
    closeModal();
  } catch (err) {
    showToast("Error al guardar", "error");
    $("btnSaveDeal").disabled = false;
  }
}

// ════════════════════════════════════════════════════════════
//  ELIMINAR
// ════════════════════════════════════════════════════════════
async function confirmDelete(coll, id, label) {
  if (!confirm(`¿Seguro que quieres eliminar ${label}? Esta acción no se puede deshacer.`)) return;
  try {
    await deleteDoc(doc(db, coll, id));
    showToast("Eliminado", "success");
  } catch (err) {
    showToast("Error al eliminar", "error");
  }
}

// ════════════════════════════════════════════════════════════
//  MODAL HELPERS
// ════════════════════════════════════════════════════════════
function openModal() {
  $("modalOverlay").classList.add("open");
}
function closeModal() {
  $("modalOverlay").classList.remove("open");
}
$("modalClose").addEventListener("click", closeModal);
$("modalOverlay").addEventListener("click", e => {
  if (e.target === $("modalOverlay")) closeModal();
});

// ════════════════════════════════════════════════════════════
//  TOAST
// ════════════════════════════════════════════════════════════
function showToast(msg, type = "") {
  const t = $("toast");
  t.textContent = msg;
  t.className = "toast show " + type;
  setTimeout(() => t.classList.remove("show"), 3000);
}

// ════════════════════════════════════════════════════════════
//  MENU MOBILE
// ════════════════════════════════════════════════════════════
$("menuToggle").addEventListener("click", () => $("sidebar").classList.toggle("open"));

// ════════════════════════════════════════════════════════════
//  ESCAPE HTML
// ════════════════════════════════════════════════════════════
function esc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
