// Register Service Worker (PWA offline)
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./service-worker.js");
}

// Helpers
const $ = (id) => document.getElementById(id);

function showMsg(text, ok = true) {
  const msg = $("msg");
  msg.textContent = text;
  msg.className = "msg " + (ok ? "ok" : "err");
  setTimeout(() => { msg.textContent = ""; msg.className = "msg"; }, 3500);
}

function parseNumero(val) {
  if (!val || !val.trim()) return null;
  const n = Number(val.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function todayISO() {
  const d = new Date();
  const pad = (x) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

// “Altro…” toggle helper
function bindAltro(selectId, altroInputId) {
  const sel = $(selectId);
  const altro = $(altroInputId);
  const refresh = () => {
    const isAltro = sel.value === "ALTRO";
    altro.style.display = isAltro ? "block" : "none";
    if (!isAltro) altro.value = "";
  };
  sel.addEventListener("change", refresh);
  refresh();
}

// Condotte table
function condottaRowTemplate(row, idx) {
  const tr = document.createElement("tr");

  const td = (child) => { const x = document.createElement("td"); x.appendChild(child); return x; };

  const idSchema = document.createElement("input");
  idSchema.value = row.id_schema ?? "";

  const direzione = document.createElement("select");
  ["Entrante", "Uscente", "Non noto"].forEach(v => {
    const o = document.createElement("option"); o.textContent = v; o.value = v;
    direzione.appendChild(o);
  });
  direzione.value = row.direzione ?? "Entrante";

  const quota = document.createElement("input");
  quota.inputMode = "decimal";
  quota.placeholder = "es. -0,6";
  quota.value = row.quota_scorrimento_raw ?? (row.quota_scorrimento != null ? String(row.quota_scorrimento).replace(".", ",") : "");

  const diam = document.createElement("input");
  diam.inputMode = "numeric";
  diam.placeholder = "es. 200";
  diam.value = row.diametro_mm ?? "";

  const mat = document.createElement("select");
  ["PVC", "CLS", "Ghisa", "PEAD", "Altro…"].forEach(v => {
    const o = document.createElement("option"); o.textContent = v; o.value = v === "Altro…" ? "ALTRO" : v;
    mat.appendChild(o);
  });
  mat.value = row.materiale ?? "PVC";

  const btnDel = document.createElement("button");
  btnDel.type = "button";
  btnDel.textContent = "Rimuovi";
  btnDel.className = "secondary";
  btnDel.addEventListener("click", () => {
    state.condotte.splice(idx, 1);
    renderCondotte();
  });

  // Keep live updates
  idSchema.addEventListener("input", () => state.condotte[idx].id_schema = idSchema.value);
  direzione.addEventListener("change", () => state.condotte[idx].direzione = direzione.value);
  quota.addEventListener("input", () => state.condotte[idx].quota_scorrimento_raw = quota.value);
  diam.addEventListener("input", () => state.condotte[idx].diametro_mm = diam.value);
  mat.addEventListener("change", () => state.condotte[idx].materiale = mat.value);

  tr.appendChild(td(idSchema));
  tr.appendChild(td(direzione));
  tr.appendChild(td(quota));
  tr.appendChild(td(diam));
  tr.appendChild(td(mat));
  tr.appendChild(td(btnDel));

  return tr;
}

function renderCondotte() {
  const tbody = $("tblCondotte").querySelector("tbody");
  tbody.innerHTML = "";
  state.condotte.forEach((row, idx) => {
    tbody.appendChild(condottaRowTemplate(row, idx));
  });
}

// Photos
function renderFotos() {
  const grid = $("fotoGrid");
  grid.innerHTML = "";
  state.foto.forEach((f, idx) => {
    const wrap = document.createElement("div");
    wrap.className = "fotoItem";

    const img = document.createElement("img");
    img.src = f.dataUrl;

    const meta = document.createElement("div");
    meta.className = "meta";
    const left = document.createElement("div");
    left.textContent = f.name || `Foto ${idx+1}`;

    const del = document.createElement("button");
    del.type = "button";
    del.textContent = "Rimuovi";
    del.addEventListener("click", () => {
      state.foto.splice(idx, 1);
      renderFotos();
    });

    meta.appendChild(left);
    meta.appendChild(del);

    wrap.appendChild(img);
    wrap.appendChild(meta);
    grid.appendChild(wrap);
  });
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

// App state
let state = {
  id: "",
  data: todayISO(),
  comune: "",
  via: "",
  coordinate: { x: null, y: null, sistema: "Gauss-Boaga", sistema_altro: "" },
  manufatto: { tipo: "Pozzetto", tipo_altro: "", materiale: "CLS", materiale_altro: "", quota_chiusino: null },
  condotte: [],
  foto: []
};

function setNetBadge() {
  $("netStatus").textContent = navigator.onLine ? "Online" : "Offline";
}
window.addEventListener("online", setNetBadge);
window.addEventListener("offline", setNetBadge);
setNetBadge();

// Bind “Altro…”
bindAltro("coordSistema", "coordSistemaAltro");
bindAltro("tipoManufatto", "tipoManufattoAltro");
bindAltro("materiale", "materialeAltro");

// Defaults
$("dataScheda").value = todayISO();

// Buttons
$("btnAddCondotta").addEventListener("click", () => {
  state.condotte.push({
    id_schema: "",
    direzione: "Entrante",
    quota_scorrimento_raw: "",
    diametro_mm: "",
    materiale: "PVC"
  });
  renderCondotte();
});

$("btnClearCondotte").addEventListener("click", () => {
  state.condotte = [];
  renderCondotte();
});

$("fotoInput").addEventListener("change", async (e) => {
  const files = [...e.target.files];
  for (const file of files) {
    const dataUrl = await fileToDataUrl(file);
    state.foto.push({ name: file.name, type: file.type, dataUrl });
  }
  e.target.value = "";
  renderFotos();
});

$("btnClearFotos").addEventListener("click", () => {
  state.foto = [];
  renderFotos();
});

function readFormIntoState() {
  state.id = $("idScheda").value.trim();
  state.data = $("dataScheda").value || todayISO();
  state.comune = $("comune").value.trim();
  state.via = $("via").value.trim();

  state.coordinate.x = parseNumero($("coordX").value);
  state.coordinate.y = parseNumero($("coordY").value);
  state.coordinate.sistema = $("coordSistema").value;
  state.coordinate.sistema_altro = $("coordSistemaAltro").value.trim();

  state.manufatto.tipo = $("tipoManufatto").value;
  state.manufatto.tipo_altro = $("tipoManufattoAltro").value.trim();

  state.manufatto.materiale = $("materiale").value;
  state.manufatto.materiale_altro = $("materialeAltro").value.trim();

  state.manufatto.quota_chiusino = parseNumero($("quotaChiusino").value);

  // Normalize condotte numeric values (keep raw too)
  state.condotte = state.condotte.map(c => ({
    ...c,
    quota_scorrimento: parseNumero(c.quota_scorrimento_raw ?? ""),
    diametro_mm: c.diametro_mm ? Number(String(c.diametro_mm).trim()) : null
  }));
}

function writeStateToForm() {
  $("idScheda").value = state.id || "";
  $("dataScheda").value = state.data || todayISO();
  $("comune").value = state.comune || "";
  $("via").value = state.via || "";

  $("coordX").value = state.coordinate.x != null ? String(state.coordinate.x).replace(".", ",") : "";
  $("coordY").value = state.coordinate.y != null ? String(state.coordinate.y).replace(".", ",") : "";

  $("coordSistema").value = state.coordinate.sistema || "Gauss-Boaga";
  $("coordSistemaAltro").value = state.coordinate.sistema_altro || "";
  $("coordSistema").dispatchEvent(new Event("change"));

  $("tipoManufatto").value = state.manufatto.tipo || "Pozzetto";
  $("tipoManufattoAltro").value = state.manufatto.tipo_altro || "";
  $("tipoManufatto").dispatchEvent(new Event("change"));

  $("materiale").value = state.manufatto.materiale || "CLS";
  $("materialeAltro").value = state.manufatto.materiale_altro || "";
  $("materiale").dispatchEvent(new Event("change"));

  $("quotaChiusino").value = state.manufatto.quota_chiusino != null
    ? String(state.manufatto.quota_chiusino).replace(".", ",")
    : "";

  renderCondotte();
  renderFotos();
}

$("btnSave").addEventListener("click", async () => {
  readFormIntoState();
  if (!state.id) return showMsg("Inserisci un ID Scheda (es. PZ-001).", false);

  await dbPutScheda(state);
  showMsg(`Salvato: ${state.id}`);
});

$("btnLoad").addEventListener("click", async () => {
  const id = $("idScheda").value.trim();
  if (!id) return showMsg("Scrivi l'ID Scheda da caricare.", false);

  const s = await dbGetScheda(id);
  if (!s) return showMsg(`Nessuna scheda trovata con ID: ${id}`, false);

  state = s;
  writeStateToForm();
  showMsg(`Caricato: ${id}`);
});

$("btnExport").addEventListener("click", () => {
  readFormIntoState();
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${state.id || "scheda"}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  showMsg("JSON esportato.");
});

$("btnNew").addEventListener("click", () => {
  state = {
    id: "",
    data: todayISO(),
    comune: "",
    via: "",
    coordinate: { x: null, y: null, sistema: "Gauss-Boaga", sistema_altro: "" },
    manufatto: { tipo: "Pozzetto", tipo_altro: "", materiale: "CLS", materiale_altro: "", quota_chiusino: null },
    condotte: [],
    foto: []
  };
  writeStateToForm();
  showMsg("Nuova scheda pronta.");
});

// Init UI
writeStateToForm();
renderCondotte();
renderFotos();
