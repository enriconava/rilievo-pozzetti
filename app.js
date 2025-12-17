// app.js
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./service-worker.js");
}

const $ = (id) => document.getElementById(id);

function showMsg(text, ok = true) {
  const msg = $("msg");
  msg.textContent = text;
  msg.className = "msg " + (ok ? "ok" : "err");
  setTimeout(() => {
    msg.textContent = "";
    msg.className = "msg";
  }, 6500);
}

function todayISO() {
  const d = new Date();
  const pad = (x) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

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

/* ===== EXPORT JSON ===== */
function exportStateAsJsonDownload() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${state.id || "scheda"}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ===== Dati generali (persistenti) ===== */
const INTRO_KEY = "pozzetti:intro_v2";
const LAST_ID_KEY = "pozzetti:last_id_v2"; // solo numero

function loadIntro() {
  try {
    const raw = localStorage.getItem(INTRO_KEY);
    if (!raw) return { comune: "", via: "", civico: "", data_rilievo: "", rilevatore: "" };
    const v = JSON.parse(raw);
    return {
      comune: v.comune || "",
      via: v.via || "",
      civico: v.civico || "",
      data_rilievo: v.data_rilievo || "",
      rilevatore: v.rilevatore || ""
    };
  } catch {
    return { comune: "", via: "", civico: "", data_rilievo: "", rilevatore: "" };
  }
}
function saveIntro(intro) {
  localStorage.setItem(INTRO_KEY, JSON.stringify(intro));
}
function clearIntro() {
  localStorage.removeItem(INTRO_KEY);
}
function getIntroFromForm() {
  return {
    comune: $("introComune").value.trim(),
    via: $("introVia").value.trim(),
    civico: $("introCivico").value.trim(),
    data_rilievo: $("introDataRilievo").value || "",
    rilevatore: $("introRilevatore").value.trim()
  };
}
function writeIntroToForm(intro) {
  $("introComune").value = intro.comune || "";
  $("introVia").value = intro.via || "";
  $("introCivico").value = intro.civico || "";
  $("introDataRilievo").value = intro.data_rilievo || "";
  $("introRilevatore").value = intro.rilevatore || "";
}

["introComune", "introVia", "introCivico", "introDataRilievo", "introRilevatore"].forEach((id) => {
  $(id).addEventListener("input", () => saveIntro(getIntroFromForm()));
  $(id).addEventListener("change", () => saveIntro(getIntroFromForm()));
});

$("btnClearIntro").addEventListener("click", () => {
  clearIntro();
  writeIntroToForm({ comune: "", via: "", civico: "", data_rilievo: "", rilevatore: "" });
  showMsg("Dati generali cancellati.");
});

/* ===== Tipo punto: macro + sub (ordinati alfabeticamente; “ALTRO” in fondo) ===== */
const TIPO_PUNTO = {
  "ALTRO": ["Pozzetto con sfioro", "Pozzetto duale", "Terminale Acque Bianche/sfiorate"],
  "CADITOIA DI LINEA": ["Caditoia a bocca di lupo su linea", "Caditoia ispezione su linea"],
  "CADITOIA FUORI LINEA": [
    "Caditoia a bocca di lupo",
    "Caditoia mista (a bocca di lupo con griglia)",
    "Caditoia piana",
    "Griglia (canalina di scolo)"
  ],
  "CAMERETTA": [
    "Accesso a rete in pressione",
    "Confluenza",
    "Confluenza e Salto",
    "Linea",
    "Partizione",
    "Pozzetto con sifone",
    "Pozzetto di cacciata",
    "Salto",
    "Sifone di monte",
    "Sifone di valle",
    "Testa"
  ],
  "DISOLEATORE": [],
  "FOSSA SETTICA/BIOLOGICA": ["Imhoff", "Tradizionale"],
  "GRIGLIA": [],
  "IMPIANTO DI DEPURAZIONE": [],
  "IMPIANTO DI GRIGLIATURA": [
    "Griglia a barre",
    "Griglia a tamburo",
    "Griglia con elementi mobili della grata",
    "Griglia radiale",
    "Schermatura ad arco",
    "sconosciuto"
  ],
  "IMPIANTO DI SOLLEVAMENTO": [
    "Di linea di acque miste",
    "Di linea di sole acque bianche",
    "Di linea di sole acque nere",
    "Immissione impianto di trattamento",
    "Immissione vasca",
    "Svuotamento Vasca"
  ],
  "ISPEZIONE": [],
  "MISURATORE": ["Altro", "Contatore", "Generico", "Livello", "Portata a gravità", "Portata in pressione"],
  "NODO DI EMISSIONE IN CAMERETTA": [],
  "NODO DI IMMISSIONE": [],
  "NODO RETICOLO IDRICO": ["Ispezione Reticolo Idrico", "Nodo Reticolo Idrico"],
  "PLUVIALE": [],
  "POZZETTO DISSABBIATORE": [],
  "POZZETTO FANTASMA": [],
  "POZZETTO SEPARATORE": [],
  "POZZO PERDENTE": [],
  "PUNTO CAMPIONAMENTO ACQUE DEPURATE": [],
  "PUNTO DI ALLACCIAMENTO UTENTE INDUSTRIALE": [],
  "PUNTO DI CAMPIONAMENTO UTENTE INDUSTRIALE": [],
  "RACCORDO": [
    "Altro",
    "Connessione a T - INNESTO ALLACCIAMENTO",
    "Connessione a T - NODO DI EMISSIONE SENZA ISPEZIONE",
    "Connessione a T - SCARICO FINALE SENZA ISPEZIONE",
    "Connessione a T o X - INNESTO IN CONDOTTA",
    "Connessione semplice",
    "Nodo di immissione/affluenza",
    "Pozzetto privato",
    "Pozzetto privato con Sifone"
  ],
  "SCARICO": [
    "Bypass Depuratore",
    "Da impianto Depurazione",
    "Da Scarico di Emergenza",
    "Da Scarico di Emergenza/Sfioratore",
    "Da Sfioratore",
    "Da Sfioratore Acque Bianche",
    "Da Vasca Imhoff",
    "Immissione Vasca Volano",
    "Terminale",
    "Terminale Acque Bianche"
  ],
  "SCARICO IN CAMERETTA": [],
  "SFIORATORE": [
    "By-pass depuratore",
    "Di linea con scarico in C.I.S.",
    "Di linea con scarico in suolo",
    "Immissione vasca a dispersione",
    "Immissione vasca a tenuta"
  ],
  "VALVOLA DI RITEGNO": [],
  "VASCA DI LAMINAZIONE - ACCUMULO": [
    "Accumulo",
    "Altro",
    "Vasca di dispersione",
    "Vasca di laminazione",
    "Vasca di prima pioggia",
    "Vasca volano"
  ]
};

function fillSelect(selectEl, options, placeholderText) {
  selectEl.innerHTML = "";
  const o0 = document.createElement("option");
  o0.value = "";
  o0.textContent = placeholderText;
  selectEl.appendChild(o0);

  options.forEach((v) => {
    const o = document.createElement("option");
    o.value = v;
    o.textContent = v;
    selectEl.appendChild(o);
  });
}

function buildTipoPuntoSub(macro, preferredValue = "") {
  const subSel = $("tipoPuntoSub");
  const subs = TIPO_PUNTO[macro] ?? [];

  if (!macro) {
    subSel.disabled = true;
    fillSelect(subSel, [], "— Seleziona categoria prima —");
    return;
  }
  if (!subs.length) {
    subSel.disabled = true;
    fillSelect(subSel, [], "— Nessuna sottocategoria —");
    return;
  }
  subSel.disabled = false;
  fillSelect(subSel, subs, "— Seleziona —");
  subSel.value = preferredValue && subs.includes(preferredValue) ? preferredValue : "";
}

function updateTipoPuntoAltroVisibility() {
  const macro = $("tipoPuntoMacro").value;
  const subSel = $("tipoPuntoSub");
  const subVal = subSel.disabled ? "" : (subSel.value || "");
  const showAltro = (macro === "ALTRO") || (subVal === "Altro");
  $("tipoPuntoAltro").style.display = showAltro ? "block" : "none";
  if (!showAltro) $("tipoPuntoAltro").value = "";
}

/* ===== Tipologia rete -> mostra/nasconde Tipologia fognatura ===== */
function setTipologiaFognaturaVisible(visible) {
  $("wrapTipologiaFognatura").classList.toggle("hiddenBlock", !visible);

  if (!visible) {
    $("tipologiaFognatura").value = "";
    $("tipologiaFognaturaAltro").value = "";
    $("tipologiaFognatura").dispatchEvent(new Event("change"));
  }
}
function refreshTipologiaFognaturaVisibility() {
  const isFognatura = $("tipologiaRete").value === "Fognatura";
  setTipologiaFognaturaVisible(isFognatura);
}

/* ===== Validazione: numeri (decimali con ".") ===== */
const INVALID_COLOR = "#b00020";

function markInvalid(el) {
  if (!el) return;
  if (!el.dataset._oldBorderColor) el.dataset._oldBorderColor = el.style.borderColor || "";
  if (!el.dataset._oldBoxShadow) el.dataset._oldBoxShadow = el.style.boxShadow || "";
  el.style.borderColor = INVALID_COLOR;
  el.style.boxShadow = "0 0 0 2px rgba(176,0,32,0.15)";
}

function clearInvalid(el) {
  if (!el) return;
  if (el.dataset._oldBorderColor !== undefined) el.style.borderColor = el.dataset._oldBorderColor;
  if (el.dataset._oldBoxShadow !== undefined) el.style.boxShadow = el.dataset._oldBoxShadow;
  delete el.dataset._oldBorderColor;
  delete el.dataset._oldBoxShadow;
}

function clearAllValidation() {
  document.querySelectorAll("input, select, textarea").forEach(clearInvalid);
}

function hasComma(val) {
  return typeof val === "string" && val.includes(",");
}

function isValidIntString(v) {
  return /^\d+$/.test(v);
}

function isValidDecimalString(v) {
  return /^-?\d+(\.\d+)?$/.test(v);
}

function validateAllNumericFields() {
  const bad = [];

  // 1) Campi statici marcati con data-num
  const inputs = [...document.querySelectorAll("input[data-num]")];

  for (const el of inputs) {
    const label = el.dataset.label || el.id || "Campo numerico";
    const t = el.dataset.num; // int | decimal
    const required = el.dataset.required === "1";
    const raw = (el.value ?? "").trim();

    if (!raw) {
      if (required) {
        bad.push(`${label} (obbligatorio)`);
        markInvalid(el);
      }
      continue;
    }

    // regole
    if (t === "int") {
      if (raw.includes(".") || raw.includes(",") || !isValidIntString(raw)) {
        bad.push(label);
        markInvalid(el);
      }
    } else if (t === "decimal") {
      if (hasComma(raw) || !isValidDecimalString(raw)) {
        bad.push(label);
        markInvalid(el);
      }
    }
  }

  // 2) Campi numerici dinamici tabella condotte
  const dyn = [...$("tblCondotte").querySelectorAll("tbody input[data-num]")];
  for (const el of dyn) {
    const label = el.dataset.label || "Condotta - campo numerico";
    const t = el.dataset.num;
    const raw = (el.value ?? "").trim();
    if (!raw) continue;

    if (t === "int") {
      if (raw.includes(".") || raw.includes(",") || !isValidIntString(raw)) {
        bad.push(label);
        markInvalid(el);
      }
    } else if (t === "decimal") {
      if (hasComma(raw) || !isValidDecimalString(raw)) {
        bad.push(label);
        markInvalid(el);
      }
    }
  }

  if (bad.length) {
    showMsg(
      `Errore numeri: usa il punto (.) per i decimali e solo cifre per gli interi. Campi errati: ${bad.join(" • ")}`,
      false
    );
    return false;
  }
  return true;
}

function validateBeforeSave() {
  clearAllValidation();
  return validateAllNumericFields();
}

/* ===== Parsing: vuoto -> "" ; altrimenti numero (con ".") ===== */
function parseNumeroOrEmpty(val) {
  const v = (val ?? "").toString().trim();
  if (!v) return "";
  const n = Number(v);
  return Number.isFinite(n) ? n : "";
}

/* ===== ID progressivo: solo numero ===== */
function incrementId(id) {
  const v = (id || "").trim();
  if (!/^\d+$/.test(v)) return v;
  return String(Number(v) + 1);
}
function loadLastId() {
  return (localStorage.getItem(LAST_ID_KEY) || "").trim();
}
function saveLastId(id) {
  if (id) localStorage.setItem(LAST_ID_KEY, id);
}

/* ===== Helpers select per tabella (ORDINATI) ===== */
const TIP_FOGNATURA = [
  "Acque Tecnologiche",
  "Bianca",
  "Depurata",
  "Mista",
  "Nera",
  "Sfiorata"
];

const COLORI_TUBAZIONI = [
  "Azzurro",
  "Bianco",
  "Blu",
  "Giallo",
  "Grigio",
  "Marrone",
  "Nero",
  "Arancione",
  "Rosso",
  "Verde",
  "Viola"
];

const MATERIALI_LIST = [
  "Acciaio",
  "Acciaio inossidabile",
  "Acciaio legato",
  "Acciaio plastificato",
  "Acciaio verniciato",
  "Acciaio zincato",
  "Calcestruzzo di poliestere",
  "Cemento amianto",
  "Cemento armato polimero",
  "CLS",
  "CLS fondo Gres",
  "CLS Gettato",
  "CLS Prefabbricato",
  "CLS Prefabbricato fondo gres",
  "Ferro",
  "Fibrocemento",
  "Ghisa",
  "Ghisa grigia (con grafite lamellare)",
  "Ghisa sferoidale",
  "Gres ceramico",
  "Lamiera",
  "Lamiera Zincata",
  "Legno",
  "Metallo",
  "Miscela di materiali diversi",
  "Muratura",
  "Ottone",
  "PEAD",
  "PEAD - 100",
  "PEAD - 80",
  "Pietra",
  "Polietilene",
  "Polietilene normalizzato esterno",
  "Poliestere",
  "Polipropilene",
  "PVC",
  "PVC  forte",
  "Resina di poliestere",
  "Resina termoindurente rinforzata con fibre vetro",
  "Non applicabile",
  "Non assegnato",
  "Non conosciuto",
  "Non definito"
];

const SEZIONI_LIST = [
  "A volta sez. ribassata",
  "Circolare",
  "Circolare parzializzata",
  "Ellittica",
  "Ovoidale (alt/larg= 3/2)",
  "Ovoidale parzializzato",
  "Ovoidale sezione tipo C",
  "Ovoidale sezione tipo Lissone",
  "Policentrica sezione tipo D",
  "Policentrica sezione tipo E1",
  "Policentrica sezione tipo E2",
  "Policentrica sezione tipo F",
  "Policentrica sezione tipo G",
  "Policentrica sezione tipo H",
  "Policentrica sezione tipo I",
  "Policentrica sezione tipo L",
  "Policentrico con cunetta",
  "Policentrico senza cunetta",
  "Quadrata",
  "Rettangolare",
  "Rettangolare - Scatolare con volta",
  "Scatolare con cunetta",
  "Scatolare con cunetta a cielo aperto",
  "Scatolare senza cunetta",
  "Scatolare senza cunetta a cielo aperto",
  "Sezione tipo fungo",
  "Semicircolare",
  "Trapezoidale",
  "Trapezoidale a cielo aperto",
  "Non Applicabile",
  "Non Assegnato",
  "Non Definito",
  "Non conosciuto"
];

const ID_SCHEMA_OPTS = [
  "n.1 - N",
  "n.2 - NE",
  "n.3 - E",
  "n.4 - SE",
  "n.5 - S",
  "n.6 - SW",
  "n.7 - W",
  "n.8 - NW"
];

function makeSelect(options, placeholder = "— Seleziona —", includeAltro = false) {
  const sel = document.createElement("select");
  const o0 = document.createElement("option");
  o0.value = "";
  o0.textContent = placeholder;
  sel.appendChild(o0);

  options.forEach((v) => {
    const o = document.createElement("option");
    o.value = v;
    o.textContent = v;
    sel.appendChild(o);
  });

  if (includeAltro) {
    const oa = document.createElement("option");
    oa.value = "ALTRO";
    oa.textContent = "Altro";
    sel.appendChild(oa);
  }
  return sel;
}

function makeAltroInput(placeholder) {
  const inp = document.createElement("input");
  inp.className = "altro";
  inp.placeholder = placeholder;
  inp.style.display = "none";
  return inp;
}

function wireAltro(selectEl, altroEl) {
  const refresh = () => {
    const isAltro = selectEl.value === "ALTRO";
    altroEl.style.display = isAltro ? "block" : "none";
    if (!isAltro) altroEl.value = "";
  };
  selectEl.addEventListener("change", refresh);
  refresh();
}

/* ===== Stato app ===== */
function normalizeToDotString(v) {
  if (v === "" || v == null) return "";
  const s = String(v).trim();
  if (!s) return "";
  return s.replaceAll(",", ".");
}

function normalizeDecimalToNumberOrEmpty(v) {
  const s = normalizeToDotString(v);
  if (!s) return "";
  const n = Number(s);
  return Number.isFinite(n) ? n : "";
}

function ensureStateShape(s) {
  const base = {
    id: "",
    data_rilievo: "",
    comune: "",
    via: "",
    civico: "",
    rilevatore: "",

    tipologia_rete: "",
    tipologia_rete_altro: "",

    tipologia_fognatura: "",
    tipologia_fognatura_altro: "",
    stato_servizio: "",
    stato_servizio_altro: "",
    accessibilita: "",
    posizione_strada: "",
    posizione_strada_altro: "",
    superficie_posa: "",
    superficie_posa_altro: "",
    tipo_punto_macro: "",
    tipo_punto_sub: "",
    tipo_punto_altro: "",

    manufatto: {
      materiale: "",
      materiale_altro: "",
      posizione_chiusino: "",
      posizione_chiusino_altro: "",
      forma_chiusino: "",
      forma_chiusino_altro: "",
      lunghezza_chiusino_cm: "",
      larghezza_chiusino_cm: "",
      diametro_chiusino_cm: "",
      altro_chiusino: "",

      presenza_banchina: "",
      profondita_banchina_cm: "",
      altro_banchina: "",

      materiale_torrino: "",
      materiale_torrino_altro: "",
      forma_torrino: "",
      forma_torrino_altro: "",
      lunghezza_torrino_cm: "",
      larghezza_torrino_cm: "",
      diametro_torrino_cm: "",
      altro_torrino: "",

      materiale_pozzetto: "",
      materiale_pozzetto_altro: "",
      forma_pozzetto: "",
      forma_pozzetto_altro: "",
      lunghezza_pozzetto_cm: "",
      larghezza_pozzetto_cm: "",
      diametro_pozzetto_cm: "",
      profondita_m: "",
      altro_pozzetto: "",

      ristagno_cm: "",
      appoggio_accesso: "",
      presenza_sedimenti: "",
      note_condizioni: ""
    },

    condotte: [],
    foto: []
  };

  const out = { ...base, ...(s || {}) };
  out.manufatto = { ...base.manufatto, ...(out.manufatto || {}) };

  // normalizza profondità pozzetto (compatibile anche con vecchi JSON)
  out.manufatto.profondita_m = normalizeDecimalToNumberOrEmpty(out.manufatto.profondita_m);

  out.condotte = Array.isArray(out.condotte) ? out.condotte : [];
  out.condotte = out.condotte.map((c) => {
    const profRaw = normalizeToDotString(c?.profondita_raw ?? "");
    const profNum = c?.profondita_m != null ? normalizeDecimalToNumberOrEmpty(c.profondita_m) : "";
    const useRaw = profRaw ? profRaw : (profNum === "" ? "" : String(profNum));

    return {
      id_schema: c?.id_schema ?? "",
      tipologia: c?.tipologia ?? "",
      tipologia_altro: c?.tipologia_altro ?? "",
      profondita_raw: useRaw,
      profondita_m: profNum,
      diametro_mm: c?.diametro_mm ?? "",
      larghezza_cm: c?.larghezza_cm ?? "",
      altezza_cm: c?.altezza_cm ?? "",
      materiale: c?.materiale ?? "",
      materiale_altro: c?.materiale_altro ?? "",
      sezione: c?.sezione ?? "",
      sezione_altro: c?.sezione_altro ?? "",
      colore: c?.colore ?? "",
      colore_altro: c?.colore_altro ?? ""
    };
  });

  out.foto = Array.isArray(out.foto) ? out.foto : [];
  return out;
}

let state = ensureStateShape({});

/* Online/offline badge */
function setNetBadge() {
  $("netStatus").textContent = navigator.onLine ? "Online" : "Offline";
}
window.addEventListener("online", setNetBadge);
window.addEventListener("offline", setNetBadge);
setNetBadge();

/* Bind “Altro…” (form) */
bindAltro("tipologiaRete", "tipologiaReteAltro");
bindAltro("tipologiaFognatura", "tipologiaFognaturaAltro");
bindAltro("statoServizio", "statoServizioAltro");
bindAltro("posizioneStrada", "posizioneStradaAltro");
bindAltro("superficiePosa", "superficiePosaAltro");

bindAltro("materiale", "materialeAltro");
bindAltro("posizioneChiusino", "posizioneChiusinoAltro");
bindAltro("formaChiusino", "formaChiusinoAltro");

bindAltro("materialeTorrino", "materialeTorrinoAltro");
bindAltro("formaTorrino", "formaTorrinoAltro");

bindAltro("materialePozzetto", "materialePozzettoAltro");
bindAltro("formaPozzetto", "formaPozzettoAltro");

/* Tipologia rete -> show/hide Tipologia fognatura */
$("tipologiaRete").addEventListener("change", () => {
  refreshTipologiaFognaturaVisibility();
});

/* ===== CONDOTTE: tabella ===== */
function condottaRowTemplate(row, idx) {
  const tr = document.createElement("tr");
  const td = (child) => {
    const x = document.createElement("td");
    x.appendChild(child);
    return x;
  };

  const idSchema = makeSelect(ID_SCHEMA_OPTS);
  idSchema.value = row.id_schema ?? "";

  const tipWrap = document.createElement("div");
  tipWrap.className = "cellStack";
  const tipSel = makeSelect(TIP_FOGNATURA, "— Seleziona —", true);
  tipSel.value = row.tipologia ?? "";
  const tipAlt = makeAltroInput("Specificare tipologia");
  tipAlt.value = row.tipologia_altro ?? "";
  wireAltro(tipSel, tipAlt);
  tipWrap.appendChild(tipSel);
  tipWrap.appendChild(tipAlt);

  const prof = document.createElement("input");
  prof.inputMode = "decimal";
  prof.placeholder = "es. 1.20";
  prof.value = normalizeToDotString(row.profondita_raw ?? "");
  prof.dataset.num = "decimal";
  prof.dataset.label = `Condotta ${idx + 1} - Profondità (m)`;

  const diam = document.createElement("input");
  diam.inputMode = "numeric";
  diam.placeholder = "es. 200";
  diam.value = row.diametro_mm ?? "";
  diam.dataset.num = "int";
  diam.dataset.label = `Condotta ${idx + 1} - Diametro (mm)`;

  const larg = document.createElement("input");
  larg.inputMode = "numeric";
  larg.placeholder = "es. 80";
  larg.value = row.larghezza_cm ?? "";
  larg.dataset.num = "int";
  larg.dataset.label = `Condotta ${idx + 1} - Larghezza (cm)`;

  const alt = document.createElement("input");
  alt.inputMode = "numeric";
  alt.placeholder = "es. 120";
  alt.value = row.altezza_cm ?? "";
  alt.dataset.num = "int";
  alt.dataset.label = `Condotta ${idx + 1} - Altezza (cm)`;

  const matWrap = document.createElement("div");
  matWrap.className = "cellStack";
  const matSel = makeSelect(MATERIALI_LIST, "— Seleziona —", true);
  matSel.value = row.materiale ?? "";
  const matAlt = makeAltroInput("Specificare materiale");
  matAlt.value = row.materiale_altro ?? "";
  wireAltro(matSel, matAlt);
  matWrap.appendChild(matSel);
  matWrap.appendChild(matAlt);

  const sezWrap = document.createElement("div");
  sezWrap.className = "cellStack";
  const sezSel = makeSelect(SEZIONI_LIST, "— Seleziona —", true);
  sezSel.value = row.sezione ?? "";
  const sezAlt = makeAltroInput("Specificare sezione");
  sezAlt.value = row.sezione_altro ?? "";
  wireAltro(sezSel, sezAlt);
  sezWrap.appendChild(sezSel);
  sezWrap.appendChild(sezAlt);

  const colWrap = document.createElement("div");
  colWrap.className = "cellStack";
  const colSel = makeSelect(COLORI_TUBAZIONI, "— Seleziona —", true);
  colSel.value = row.colore ?? "";
  const colAlt = makeAltroInput("Specificare colore");
  colAlt.value = row.colore_altro ?? "";
  wireAltro(colSel, colAlt);
  colWrap.appendChild(colSel);
  colWrap.appendChild(colAlt);

  const btnDel = document.createElement("button");
  btnDel.type = "button";
  btnDel.textContent = "Rimuovi";
  btnDel.className = "secondary";
  btnDel.addEventListener("click", () => {
    state.condotte.splice(idx, 1);
    renderCondotte();
  });

  idSchema.addEventListener("change", () => (state.condotte[idx].id_schema = idSchema.value));
  tipSel.addEventListener("change", () => (state.condotte[idx].tipologia = tipSel.value));
  tipAlt.addEventListener("input", () => (state.condotte[idx].tipologia_altro = tipAlt.value));
  prof.addEventListener("input", () => (state.condotte[idx].profondita_raw = prof.value));
  diam.addEventListener("input", () => (state.condotte[idx].diametro_mm = diam.value));
  larg.addEventListener("input", () => (state.condotte[idx].larghezza_cm = larg.value));
  alt.addEventListener("input", () => (state.condotte[idx].altezza_cm = alt.value));
  matSel.addEventListener("change", () => (state.condotte[idx].materiale = matSel.value));
  matAlt.addEventListener("input", () => (state.condotte[idx].materiale_altro = matAlt.value));
  sezSel.addEventListener("change", () => (state.condotte[idx].sezione = sezSel.value));
  sezAlt.addEventListener("input", () => (state.condotte[idx].sezione_altro = sezAlt.value));
  colSel.addEventListener("change", () => (state.condotte[idx].colore = colSel.value));
  colAlt.addEventListener("input", () => (state.condotte[idx].colore_altro = colAlt.value));

  tr.appendChild(td(idSchema));
  tr.appendChild(td(tipWrap));
  tr.appendChild(td(prof));
  tr.appendChild(td(diam));
  tr.appendChild(td(larg));
  tr.appendChild(td(alt));
  tr.appendChild(td(matWrap));
  tr.appendChild(td(sezWrap));
  tr.appendChild(td(colWrap));
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

/* ===== FOTO + CROP ===== */
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
    left.textContent = f.name || `Foto ${idx + 1}`;

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

let cropper = null;
let pendingCropFile = null;

function openCropModal(dataUrl, file) {
  pendingCropFile = file;

  const modal = $("cropModal");
  const img = $("cropImage");
  img.src = dataUrl;

  modal.classList.remove("hidden");

  if (cropper) {
    cropper.destroy();
    cropper = null;
  }

  cropper = new Cropper(img, {
    viewMode: 1,
    autoCropArea: 1,
    responsive: true,
    background: false,
    movable: true,
    zoomable: true,
    rotatable: true
  });
}

function closeCropModal() {
  $("cropModal").classList.add("hidden");
  if (cropper) {
    cropper.destroy();
    cropper = null;
  }
  pendingCropFile = null;
}

$("btnCropClose").addEventListener("click", closeCropModal);
$("btnCropRotateL").addEventListener("click", () => cropper && cropper.rotate(-90));
$("btnCropRotateR").addEventListener("click", () => cropper && cropper.rotate(90));
$("btnCropReset").addEventListener("click", () => cropper && cropper.reset());

$("btnCropUse").addEventListener("click", () => {
  if (!cropper) return;

  const canvas = cropper.getCroppedCanvas({
    maxWidth: 1600,
    maxHeight: 1600,
    imageSmoothingEnabled: true,
    imageSmoothingQuality: "high"
  });

  const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
  const name = pendingCropFile?.name || `foto_${Date.now()}.jpg`;

  state.foto.push({ name, type: "image/jpeg", dataUrl });
  renderFotos();
  closeCropModal();
});

$("fotoInput").addEventListener("change", async (e) => {
  const files = [...(e.target.files || [])];
  e.target.value = "";

  for (const file of files) {
    const dataUrl = await fileToDataUrl(file);
    openCropModal(dataUrl, file);

    await new Promise((resolve) => {
      const observer = new MutationObserver(() => {
        if ($("cropModal").classList.contains("hidden")) {
          observer.disconnect();
          resolve();
        }
      });
      observer.observe($("cropModal"), { attributes: true, attributeFilter: ["class"] });
    });
  }
});

/* ===== Bottoni Condotte/Fotos ===== */
$("btnAddCondotta").addEventListener("click", () => {
  state.condotte.push({
    id_schema: "",
    tipologia: "",
    tipologia_altro: "",
    profondita_raw: "",
    profondita_m: "",
    diametro_mm: "",
    larghezza_cm: "",
    altezza_cm: "",
    materiale: "",
    materiale_altro: "",
    sezione: "",
    sezione_altro: "",
    colore: "",
    colore_altro: ""
  });
  renderCondotte();
});

$("btnClearCondotte").addEventListener("click", () => {
  state.condotte = [];
  renderCondotte();
});

$("btnClearFotos").addEventListener("click", () => {
  state.foto = [];
  renderFotos();
});

/* ===== Lettura/scrittura form <-> state ===== */
function readFormIntoState() {
  const intro = getIntroFromForm();
  state.comune = intro.comune;
  state.via = intro.via;
  state.civico = intro.civico;
  state.data_rilievo = intro.data_rilievo;
  state.rilevatore = intro.rilevatore;

  state.id = $("idScheda").value.trim();

  state.tipologia_rete = $("tipologiaRete").value || "";
  state.tipologia_rete_altro = $("tipologiaReteAltro").value.trim();

  const isFognatura = state.tipologia_rete === "Fognatura";
  state.tipologia_fognatura = isFognatura ? ($("tipologiaFognatura").value || "") : "";
  state.tipologia_fognatura_altro = isFognatura ? $("tipologiaFognaturaAltro").value.trim() : "";

  state.stato_servizio = $("statoServizio").value || "";
  state.stato_servizio_altro = $("statoServizioAltro").value.trim();

  state.accessibilita = $("accessibilita").value || "";

  state.posizione_strada = $("posizioneStrada").value || "";
  state.posizione_strada_altro = $("posizioneStradaAltro").value.trim();

  state.superficie_posa = $("superficiePosa").value || "";
  state.superficie_posa_altro = $("superficiePosaAltro").value.trim();

  state.tipo_punto_macro = $("tipoPuntoMacro").value || "";
  state.tipo_punto_sub = $("tipoPuntoSub").disabled ? "" : ($("tipoPuntoSub").value || "");
  state.tipo_punto_altro = $("tipoPuntoAltro").value.trim();

  // Manufatto
  state.manufatto.materiale = $("materiale").value || "";
  state.manufatto.materiale_altro = $("materialeAltro").value.trim();

  state.manufatto.posizione_chiusino = $("posizioneChiusino").value || "";
  state.manufatto.posizione_chiusino_altro = $("posizioneChiusinoAltro").value.trim();

  state.manufatto.forma_chiusino = $("formaChiusino").value || "";
  state.manufatto.forma_chiusino_altro = $("formaChiusinoAltro").value.trim();

  state.manufatto.lunghezza_chiusino_cm = $("lunghezzaChiusino").value.trim();
  state.manufatto.larghezza_chiusino_cm = $("larghezzaChiusino").value.trim();
  state.manufatto.diametro_chiusino_cm = $("diametroChiusino").value.trim();
  state.manufatto.altro_chiusino = $("altroChiusino").value.trim();

  state.manufatto.presenza_banchina = $("presenzaBanchina").value || "";
  state.manufatto.profondita_banchina_cm = $("profonditaBanchina").value.trim();
  state.manufatto.altro_banchina = $("altroBanchina").value.trim();

  state.manufatto.materiale_torrino = $("materialeTorrino").value || "";
  state.manufatto.materiale_torrino_altro = $("materialeTorrinoAltro").value.trim();

  state.manufatto.forma_torrino = $("formaTorrino").value || "";
  state.manufatto.forma_torrino_altro = $("formaTorrinoAltro").value.trim();

  state.manufatto.lunghezza_torrino_cm = $("lunghezzaTorrino").value.trim();
  state.manufatto.larghezza_torrino_cm = $("larghezzaTorrino").value.trim();
  state.manufatto.diametro_torrino_cm = $("diametroTorrino").value.trim();
  state.manufatto.altro_torrino = $("altroTorrino").value.trim();

  state.manufatto.materiale_pozzetto = $("materialePozzetto").value || "";
  state.manufatto.materiale_pozzetto_altro = $("materialePozzettoAltro").value.trim();

  state.manufatto.forma_pozzetto = $("formaPozzetto").value || "";
  state.manufatto.forma_pozzetto_altro = $("formaPozzettoAltro").value.trim();

  state.manufatto.lunghezza_pozzetto_cm = $("lunghezzaPozzetto").value.trim();
  state.manufatto.larghezza_pozzetto_cm = $("larghezzaPozzetto").value.trim();
  state.manufatto.diametro_pozzetto_cm = $("diametroPozzetto").value.trim();

  state.manufatto.profondita_m = parseNumeroOrEmpty($("profondita").value);
  state.manufatto.altro_pozzetto = $("altroPozzetto").value.trim();

  state.manufatto.ristagno_cm = $("ristagno").value.trim();
  state.manufatto.appoggio_accesso = $("appoggioAccesso").value || "";
  state.manufatto.presenza_sedimenti = $("presenzaSedimenti").value || "";
  state.manufatto.note_condizioni = $("noteCondizioni").value.trim();

  // Condotte: calcolo profondità numerica
  state.condotte = state.condotte.map((c) => ({
    ...c,
    profondita_raw: normalizeToDotString(c.profondita_raw ?? ""),
    profondita_m: parseNumeroOrEmpty(normalizeToDotString(c.profondita_raw ?? "")),
    diametro_mm: String(c.diametro_mm ?? "").trim(),
    larghezza_cm: String(c.larghezza_cm ?? "").trim(),
    altezza_cm: String(c.altezza_cm ?? "").trim()
  }));
}

function writeStateToForm() {
  $("idScheda").value = state.id || "";

  $("tipologiaRete").value = state.tipologia_rete || "";
  $("tipologiaReteAltro").value = state.tipologia_rete_altro || "";
  $("tipologiaRete").dispatchEvent(new Event("change"));
  refreshTipologiaFognaturaVisibility();

  if (state.tipologia_rete === "Fognatura") {
    $("tipologiaFognatura").value = state.tipologia_fognatura || "";
    $("tipologiaFognaturaAltro").value = state.tipologia_fognatura_altro || "";
    $("tipologiaFognatura").dispatchEvent(new Event("change"));
  }

  $("statoServizio").value = state.stato_servizio || "";
  $("statoServizioAltro").value = state.stato_servizio_altro || "";
  $("statoServizio").dispatchEvent(new Event("change"));

  $("accessibilita").value = state.accessibilita || "";

  $("posizioneStrada").value = state.posizione_strada || "";
  $("posizioneStradaAltro").value = state.posizione_strada_altro || "";
  $("posizioneStrada").dispatchEvent(new Event("change"));

  $("superficiePosa").value = state.superficie_posa || "";
  $("superficiePosaAltro").value = state.superficie_posa_altro || "";
  $("superficiePosa").dispatchEvent(new Event("change"));

  $("tipoPuntoMacro").value = state.tipo_punto_macro || "";
  buildTipoPuntoSub($("tipoPuntoMacro").value, state.tipo_punto_sub || "");
  $("tipoPuntoAltro").value = state.tipo_punto_altro || "";
  updateTipoPuntoAltroVisibility();

  $("materiale").value = state.manufatto.materiale || "";
  $("materialeAltro").value = state.manufatto.materiale_altro || "";
  $("materiale").dispatchEvent(new Event("change"));

  $("posizioneChiusino").value = state.manufatto.posizione_chiusino || "";
  $("posizioneChiusinoAltro").value = state.manufatto.posizione_chiusino_altro || "";
  $("posizioneChiusino").dispatchEvent(new Event("change"));

  $("formaChiusino").value = state.manufatto.forma_chiusino || "";
  $("formaChiusinoAltro").value = state.manufatto.forma_chiusino_altro || "";
  $("formaChiusino").dispatchEvent(new Event("change"));

  $("lunghezzaChiusino").value = state.manufatto.lunghezza_chiusino_cm || "";
  $("larghezzaChiusino").value = state.manufatto.larghezza_chiusino_cm || "";
  $("diametroChiusino").value = state.manufatto.diametro_chiusino_cm || "";
  $("altroChiusino").value = state.manufatto.altro_chiusino || "";

  $("presenzaBanchina").value = state.manufatto.presenza_banchina || "";
  $("profonditaBanchina").value = state.manufatto.profondita_banchina_cm || "";
  $("altroBanchina").value = state.manufatto.altro_banchina || "";

  $("materialeTorrino").value = state.manufatto.materiale_torrino || "";
  $("materialeTorrinoAltro").value = state.manufatto.materiale_torrino_altro || "";
  $("materialeTorrino").dispatchEvent(new Event("change"));

  $("formaTorrino").value = state.manufatto.forma_torrino || "";
  $("formaTorrinoAltro").value = state.manufatto.forma_torrino_altro || "";
  $("formaTorrino").dispatchEvent(new Event("change"));

  $("lunghezzaTorrino").value = state.manufatto.lunghezza_torrino_cm || "";
  $("larghezzaTorrino").value = state.manufatto.larghezza_torrino_cm || "";
  $("diametroTorrino").value = state.manufatto.diametro_torrino_cm || "";
  $("altroTorrino").value = state.manufatto.altro_torrino || "";

  $("materialePozzetto").value = state.manufatto.materiale_pozzetto || "";
  $("materialePozzettoAltro").value = state.manufatto.materiale_pozzetto_altro || "";
  $("materialePozzetto").dispatchEvent(new Event("change"));

  $("formaPozzetto").value = state.manufatto.forma_pozzetto || "";
  $("formaPozzettoAltro").value = state.manufatto.forma_pozzetto_altro || "";
  $("formaPozzetto").dispatchEvent(new Event("change"));

  $("lunghezzaPozzetto").value = state.manufatto.lunghezza_pozzetto_cm || "";
  $("larghezzaPozzetto").value = state.manufatto.larghezza_pozzetto_cm || "";
  $("diametroPozzetto").value = state.manufatto.diametro_pozzetto_cm || "";

  $("profondita").value =
    state.manufatto.profondita_m === "" || state.manufatto.profondita_m == null
      ? ""
      : String(state.manufatto.profondita_m);

  $("altroPozzetto").value = state.manufatto.altro_pozzetto || "";

  $("ristagno").value = state.manufatto.ristagno_cm || "";
  $("appoggioAccesso").value = state.manufatto.appoggio_accesso || "";
  $("presenzaSedimenti").value = state.manufatto.presenza_sedimenti || "";
  $("noteCondizioni").value = state.manufatto.note_condizioni || "";

  renderCondotte();
  renderFotos();
}

/* ===== Salva+Esporta / Importa / Carica / Nuova ===== */
$("btnSaveExport").addEventListener("click", async () => {
  if (!validateBeforeSave()) return;

  saveIntro(getIntroFromForm());
  readFormIntoState();

  await dbPutScheda(state);
  exportStateAsJsonDownload();
  saveLastId(state.id);

  const nextId = incrementId(state.id);
  $("idScheda").value = nextId;
  state.id = nextId;

  showMsg(`Salvato + esportato. Prossimo ID: ${nextId}`);
});

$("btnImport").addEventListener("click", () => $("importJson").click());

$("importJson").addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  e.target.value = "";
  if (!file) return;

  try {
    const text = await file.text();
    const data = JSON.parse(text);

    state = ensureStateShape(data);

    const intro = {
      comune: state.comune || "",
      via: state.via || "",
      civico: state.civico || "",
      data_rilievo: state.data_rilievo || "",
      rilevatore: state.rilevatore || ""
    };
    writeIntroToForm(intro);
    saveIntro(intro);

    writeStateToForm();

    if (state.id) {
      await dbPutScheda(state);
      saveLastId(state.id);
    }

    showMsg(`Import OK: ${state.id || file.name}`);
  } catch (err) {
    console.error(err);
    showMsg("Import fallito: JSON non valido", false);
  }
});

$("btnLoad").addEventListener("click", async () => {
  const id = $("idScheda").value.trim();
  if (!id) return showMsg("Scrivi l'ID Scheda da caricare.", false);

  const s = await dbGetScheda(id);
  if (!s) return showMsg(`Nessuna scheda trovata con ID: ${id}`, false);

  state = ensureStateShape(s);

  const intro = {
    comune: state.comune || "",
    via: state.via || "",
    civico: state.civico || "",
    data_rilievo: state.data_rilievo || "",
    rilevatore: state.rilevatore || ""
  };
  writeIntroToForm(intro);
  saveIntro(intro);

  writeStateToForm();
  saveLastId(state.id);

  showMsg(`Caricato: ${id}`);
});

$("btnNew").addEventListener("click", () => {
  const keepId = $("idScheda").value.trim();
  state = ensureStateShape({ id: keepId, condotte: [], foto: [] });
  writeStateToForm();
  clearAllValidation();
  showMsg("Nuova scheda pronta.");
});

/* ===== INIT ===== */
(function init() {
  // Macro tipo punto (ordinati alfabeticamente; “ALTRO” in fondo)
  const macros = Object.keys(TIPO_PUNTO);
  const macrosSorted = macros
    .filter((m) => m !== "ALTRO")
    .sort((a, b) => a.localeCompare(b, "it"))
    .concat(macros.includes("ALTRO") ? ["ALTRO"] : []);

  const macroSel = $("tipoPuntoMacro");
  macrosSorted.forEach((m) => {
    const o = document.createElement("option");
    o.value = m;
    o.textContent = m;
    macroSel.appendChild(o);
  });

  macroSel.addEventListener("change", () => {
    buildTipoPuntoSub(macroSel.value, "");
    updateTipoPuntoAltroVisibility();
  });
  $("tipoPuntoSub").addEventListener("change", updateTipoPuntoAltroVisibility);

  // Intro persistente
  const intro = loadIntro();
  if (!intro.data_rilievo) intro.data_rilievo = todayISO();
  writeIntroToForm(intro);

  // ID progressivo
  const last = loadLastId();
  const startId = /^\d+$/.test(last) ? incrementId(last) : "1";
  $("idScheda").value = startId;
  state.id = startId;

  // Tipologia rete: default vuoto, quindi fognatura nascosta
  refreshTipologiaFognaturaVisibility();

  buildTipoPuntoSub("", "");
  writeStateToForm();
  renderCondotte();
  renderFotos();
})();
