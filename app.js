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

/* ===== Tipo punto: macro + sub (ordinati alfabeticamente; “Altro” in fondo) ===== */
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
  "MISURATORE": ["Altro", "Contatore", "Generico", "Livello", "Portata a gravità", "Portata in pressione"],
  "NODO DI EMISSIONE IN CAMERETTA": [],
  "NODO DI IMMISSIONE": [],
  "NODO RETICOLO IDRICO": ["Ispezione Reticolo Idrico", "Nodo Reticolo Idrico"],
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
  ],
  "GRIGLIA": [],
  "ISPEZIONE": [],
  "PLUVIALE": []
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
  const subs = TIPO_PUNTO[macro?.toUpperCase()] ?? [];

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
  const macro = ($("tipoPuntoMacro").value || "").toUpperCase();
  const subSel = $("tipoPuntoSub");
  const subVal = subSel.disabled ? "" : (subSel.value || "");
  const showAltro = (macro === "ALTRO") || (subVal === "Altro");
  $("tipoPuntoAltro").style.display = showAltro ? "block" : "none";
  if (!showAltro) $("tipoPuntoAltro").value = "";
}

/* ===== Validazione: vieta "," nei decimali, evidenzia rosso ===== */
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

function hasComma(val) {
  return typeof val === "string" && val.includes(",");
}

/**
 * ✅ FIX TASTIERA: per evitare keypad “solo numeri senza .”
 * - Forza tutti gli input con data-decimal="1" a:
 *   type="text" + inputmode="text" (così la tastiera permette il punto)
 * - Filtra live: consenti solo cifre e un solo "."
 * - Blocca la virgola (,) e qualunque carattere non ammesso.
 */
function wireNumericTextInputs() {
  const nodes = document.querySelectorAll("input[data-decimal='1']");
  nodes.forEach((inp) => {
    if (inp.dataset._wiredNumericText === "1") return;
    inp.dataset._wiredNumericText = "1";

    // forza comportamento "testo" (tastiera completa)
    inp.type = "text";
    inp.inputMode = "text";
    inp.autocomplete = "off";
    inp.spellcheck = false;

    const normalize = (raw) => {
      let s = String(raw ?? "");

      // se c'è virgola -> invalido (non la convertiamo, come richiesto)
      if (s.includes(",")) return { value: s, badComma: true };

      // tieni solo цифre e punti
      s = s.replace(/[^\d.]/g, "");

      // consenti un solo punto
      const parts = s.split(".");
      if (parts.length > 2) {
        s = parts[0] + "." + parts.slice(1).join(""); // rimuove i punti extra
      }

      return { value: s, badComma: false };
    };

    inp.addEventListener("beforeinput", (e) => {
      // blocca direttamente la virgola
      if (e.data === ",") {
        e.preventDefault();
        markInvalid(inp);
        showMsg("Usa il punto (.) per i decimali. La virgola (,) non è ammessa.", false);
      }
    });

    inp.addEventListener("input", () => {
      const { value, badComma } = normalize(inp.value);
      if (badComma) {
        markInvalid(inp);
        showMsg("Usa il punto (.) per i decimali. La virgola (,) non è ammessa.", false);
        return;
      }

      // se normalizzazione ha rimosso caratteri strani/punti multipli, aggiorna
      if (inp.value !== value) inp.value = value;

      // valida: vuoto ok, "." da solo ok mentre scrivi, "12." ok mentre scrivi
      clearInvalid(inp);
    });

    inp.addEventListener("blur", () => {
      // a fine editing: non lasciare "." da solo
      if (inp.value.trim() === ".") inp.value = "";
      if (hasComma(inp.value)) {
        markInvalid(inp);
        showMsg("Virgola (,) non ammessa. Usa il punto (.).", false);
      }
    });
  });
}

function clearAllValidation() {
  const nodes = [
    $("idScheda"),
    ...document.querySelectorAll("input[data-decimal='1']"),
    ...$("tblCondotte").querySelectorAll("tbody input[data-decimal='1']")
  ];
  nodes.forEach(clearInvalid);
}

function validateBeforeSave() {
  clearAllValidation();
  const bad = [];

  const idVal = $("idScheda").value.trim();
  if (!/^\d+$/.test(idVal)) {
    bad.push("ID Scheda (solo numero intero)");
    markInvalid($("idScheda"));
  }
  if (hasComma(idVal)) {
    bad.push("ID Scheda (virgola non ammessa)");
    markInvalid($("idScheda"));
  }

  // ✅ valida tutti i campi numerici marcati data-decimal=1
  const allDecimals = [
    ...document.querySelectorAll("input[data-decimal='1']"),
    ...$("tblCondotte").querySelectorAll("tbody input[data-decimal='1']")
  ];

  allDecimals.forEach((inp) => {
    const label = inp.dataset.label || inp.id || "Campo numerico";
    const v = (inp.value || "").trim();
    if (hasComma(v)) {
      bad.push(label);
      markInvalid(inp);
    }
    if (v && !/^\d+(\.\d+)?$/.test(v)) {
      // accetta 12, 12.3 ; non accetta "12.." "a" ecc.
      // (nota: vuoto è ok)
      bad.push(label);
      markInvalid(inp);
    }
  });

  if (bad.length) {
    showMsg(`Valori non validi nei campi: ${bad.join(" • ")}`, false);
    return false;
  }
  return true;
}

/* ===== Parsing: vuoto -> "" ; altrimenti numero (con punto) ===== */
function parseNumeroOrEmpty(val) {
  const v = (val ?? "").toString().trim();
  if (!v) return "";
  if (hasComma(v)) return "";
  if (!/^\d+(\.\d+)?$/.test(v)) return "";
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

const DIREZIONE_CONDOTTA = ["Entrante", "Uscente", "Attraversamento"];

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

      presenza_torrino: "",
      altezza_torrino_cm: "",

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
      profondita_pozzetto_cm: "",
      altro_pozzetto: "",

      ristagno_cm: "",
      appoggio_accesso: "",
      presenza_sedimenti: "",
      profondita_soglia_cm: "",
      note_condizioni: ""
    },

    condotte: [],
    foto: []
  };

  const out = { ...base, ...(s || {}) };
  out.manufatto = { ...base.manufatto, ...(out.manufatto || {}) };

  out.condotte = Array.isArray(out.condotte) ? out.condotte : [];
  out.condotte = out.condotte.map((c) => ({
    id_schema: c?.id_schema ?? "",
    direzione: c?.direzione ?? "",
    tipologia: c?.tipologia ?? "",
    tipologia_altro: c?.tipologia_altro ?? "",

    pozzetto_origine: c?.pozzetto_origine ?? "",
    pozzetto_destinazione: c?.pozzetto_destinazione ?? "",
    altro: c?.altro ?? "",

    profondita_raw:
      c?.profondita_raw ??
      (c?.profondita_m !== "" && c?.profondita_m != null ? String(c.profondita_m) : ""),
    profondita_m: c?.profondita_m ?? "",

    diametro_raw:
      c?.diametro_raw ??
      (c?.diametro_cm !== "" && c?.diametro_cm != null ? String(c.diametro_cm) : ""),
    diametro_cm: c?.diametro_cm ?? "",

    larghezza_raw:
      c?.larghezza_raw ??
      (c?.larghezza_cm !== "" && c?.larghezza_cm != null ? String(c.larghezza_cm) : ""),
    larghezza_cm: c?.larghezza_cm ?? "",

    altezza_raw:
      c?.altezza_raw ??
      (c?.altezza_cm !== "" && c?.altezza_cm != null ? String(c.altezza_cm) : ""),
    altezza_cm: c?.altezza_cm ?? "",

    materiale: c?.materiale ?? "",
    materiale_altro: c?.materiale_altro ?? "",
    sezione: c?.sezione ?? "",
    sezione_altro: c?.sezione_altro ?? "",
    colore: c?.colore ?? "",
    colore_altro: c?.colore_altro ?? ""
  }));

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

bindAltro("tipologiaFognatura", "tipologiaFognaturaAltro");

function refreshTipologiaFognaturaVisibility() {
  const isFog = $("tipologiaRete").value === "Fognatura";
  $("wrapTipologiaFognatura").style.display = isFog ? "block" : "none";
  if (!isFog) {
    $("tipologiaFognatura").value = "";
    $("tipologiaFognaturaAltro").value = "";
    $("tipologiaFognatura").dispatchEvent(new Event("change"));
  }
}
$("tipologiaRete").addEventListener("change", refreshTipologiaFognaturaVisibility);
refreshTipologiaFognaturaVisibility();

/* ===== CONDOTTE: tabella ===== */
// ✅ riordino condotte (drag & drop)
let _dragCondottaIndex = null;
function moveCondotta(fromIdx, toIdx) {
  if (fromIdx == null || toIdx == null) return;
  if (fromIdx === toIdx) return;
  if (fromIdx < 0 || toIdx < 0) return;
  if (fromIdx >= state.condotte.length || toIdx >= state.condotte.length) return;

  const [item] = state.condotte.splice(fromIdx, 1);
  state.condotte.splice(toIdx, 0, item);
  renderCondotte();
}

function condottaRowTemplate(row, idx) {
  const tr = document.createElement("tr");
  const td = (child) => {
    const x = document.createElement("td");
    x.appendChild(child);
    return x;
  };

  // drag handle
  const dragHandle = document.createElement("span");
  dragHandle.textContent = "↕";
  dragHandle.title = "Trascina per riordinare";
  dragHandle.draggable = true;
  dragHandle.style.cursor = "grab";
  dragHandle.style.userSelect = "none";

  dragHandle.addEventListener("dragstart", (e) => {
    _dragCondottaIndex = idx;
    try {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", String(idx));
    } catch {}
  });

  dragHandle.addEventListener("dragend", () => {
    _dragCondottaIndex = null;
    tr.style.outline = "";
  });

  // abilita drop su tutta la riga
  tr.addEventListener("dragover", (e) => {
    if (_dragCondottaIndex == null) return;
    e.preventDefault();
    tr.style.outline = "2px dashed rgba(31,79,216,0.5)";
  });

  tr.addEventListener("dragleave", () => {
    tr.style.outline = "";
  });

  tr.addEventListener("drop", (e) => {
    if (_dragCondottaIndex == null) return;
    e.preventDefault();
    tr.style.outline = "";
    moveCondotta(_dragCondottaIndex, idx);
    _dragCondottaIndex = null;
  });


  const idSchema = makeSelect(ID_SCHEMA_OPTS);
  idSchema.value = row.id_schema ?? "";

  const dirSel = makeSelect(DIREZIONE_CONDOTTA, "— Seleziona —", false);
  dirSel.value = row.direzione ?? "";

  const tipWrap = document.createElement("div");
  tipWrap.className = "cellStack";
  const tipSel = makeSelect(TIP_FOGNATURA, "— Seleziona —", true);
  tipSel.value = row.tipologia ?? "";
  const tipAlt = makeAltroInput("Specificare tipologia");
  tipAlt.value = row.tipologia_altro ?? "";
  wireAltro(tipSel, tipAlt);
  tipWrap.appendChild(tipSel);
  tipWrap.appendChild(tipAlt);

  const pozzO = document.createElement("input");
  pozzO.type = "text";
  pozzO.placeholder = "es. 1";
  pozzO.value = row.pozzetto_origine ?? "";

  const pozzD = document.createElement("input");
  pozzD.type = "text";
  pozzD.placeholder = "es. 2";
  pozzD.value = row.pozzetto_destinazione ?? "";

  const altroC = document.createElement("input");
  altroC.type = "text";
  altroC.placeholder = "Note (facoltativo)";
  altroC.value = row.altro ?? "";

  const prof = document.createElement("input");
  prof.type = "text";
  prof.inputMode = "text";
  prof.placeholder = "es. 120";
  prof.value = row.profondita_raw ?? "";
  prof.dataset.decimal = "1";
  prof.dataset.label = `Condotta ${idx + 1} - Profondità (cm)`;

  const diam = document.createElement("input");
  diam.type = "text";
  diam.inputMode = "text";
  diam.placeholder = "es. 20.5";
  diam.value = row.diametro_raw ?? "";
  diam.dataset.decimal = "1";
  diam.dataset.label = `Condotta ${idx + 1} - Diametro (cm)`;

  const larg = document.createElement("input");
  larg.type = "text";
  larg.inputMode = "text";
  larg.placeholder = "es. 30.0";
  larg.value = row.larghezza_raw ?? "";
  larg.dataset.decimal = "1";
  larg.dataset.label = `Condotta ${idx + 1} - Larghezza (cm)`;

  const alt = document.createElement("input");
  alt.type = "text";
  alt.inputMode = "text";
  alt.placeholder = "es. 40.0";
  alt.value = row.altezza_raw ?? "";
  alt.dataset.decimal = "1";
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
  dirSel.addEventListener("change", () => (state.condotte[idx].direzione = dirSel.value));

  tipSel.addEventListener("change", () => (state.condotte[idx].tipologia = tipSel.value));
  tipAlt.addEventListener("input", () => (state.condotte[idx].tipologia_altro = tipAlt.value));


  pozzO.addEventListener("input", () => (state.condotte[idx].pozzetto_origine = pozzO.value));
  pozzD.addEventListener("input", () => (state.condotte[idx].pozzetto_destinazione = pozzD.value));
  altroC.addEventListener("input", () => (state.condotte[idx].altro = altroC.value));

  prof.addEventListener("input", () => (state.condotte[idx].profondita_raw = prof.value));
  diam.addEventListener("input", () => (state.condotte[idx].diametro_raw = diam.value));
  larg.addEventListener("input", () => (state.condotte[idx].larghezza_raw = larg.value));
  alt.addEventListener("input", () => (state.condotte[idx].altezza_raw = alt.value));

  matSel.addEventListener("change", () => (state.condotte[idx].materiale = matSel.value));
  matAlt.addEventListener("input", () => (state.condotte[idx].materiale_altro = matAlt.value));

  sezSel.addEventListener("change", () => (state.condotte[idx].sezione = sezSel.value));
  sezAlt.addEventListener("input", () => (state.condotte[idx].sezione_altro = sezAlt.value));

  colSel.addEventListener("change", () => (state.condotte[idx].colore = colSel.value));
  colAlt.addEventListener("input", () => (state.condotte[idx].colore_altro = colAlt.value));

  tr.appendChild(td(dragHandle));
  tr.appendChild(td(idSchema));
  tr.appendChild(td(dirSel));
  tr.appendChild(td(tipWrap));
  tr.appendChild(td(pozzO));
  tr.appendChild(td(pozzD));
  tr.appendChild(td(altroC));
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

  // ✅ importantissimo: dopo render dei campi dinamici
  wireNumericTextInputs();
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
    direzione: "",
    tipologia: "",
    tipologia_altro: "",

    pozzetto_origine: "",
    pozzetto_destinazione: "",
    altro: "",

    profondita_raw: "",
    profondita_m: "",

    diametro_raw: "",
    diametro_cm: "",

    larghezza_raw: "",
    larghezza_cm: "",

    altezza_raw: "",
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

  const isFog = state.tipologia_rete === "Fognatura";
  state.tipologia_fognatura = isFog ? ($("tipologiaFognatura").value || "") : "";
  state.tipologia_fognatura_altro = isFog ? $("tipologiaFognaturaAltro").value.trim() : "";

  state.stato_servizio = $("statoServizio").value || "";
  state.stato_servizio_altro = $("statoServizioAltro").value.trim();

  state.accessibilita = $("accessibilita").value || "";

  state.posizione_strada = $("posizioneStrada").value || "";
  state.posizione_strada_altro = $("posizioneStradaAltro").value.trim();

  state.superficie_posa = $("superficiePosa").value || "";
  state.superficie_posa_altro = $("superficiePosaAltro").value.trim();

  // 👇 macro salvata in minuscolo (come richiesto)
  state.tipo_punto_macro = ($("tipoPuntoMacro").value || "").toLowerCase();
  state.tipo_punto_sub = $("tipoPuntoSub").disabled ? "" : ($("tipoPuntoSub").value || "");
  state.tipo_punto_altro = $("tipoPuntoAltro").value.trim();

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

  state.manufatto.presenza_torrino = $("presenzaTorrino").value || "";
  state.manufatto.altezza_torrino_cm = $("altezzaTorrino").value.trim();

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

  state.manufatto.profondita_pozzetto_cm = parseNumeroOrEmpty($("profonditaPozzetto").value);
  state.manufatto.altro_pozzetto = $("altroPozzetto").value.trim();

  state.manufatto.ristagno_cm = $("ristagno").value.trim();
  state.manufatto.appoggio_accesso = $("appoggioAccesso").value || "";
  state.manufatto.presenza_sedimenti = $("presenzaSedimenti").value || "";
  state.manufatto.profondita_soglia_cm = $("profonditaSoglia").value.trim();
  state.manufatto.note_condizioni = $("noteCondizioni").value.trim();

  state.condotte = state.condotte.map((c) => ({
    ...c,
    profondita_m: parseNumeroOrEmpty(c.profondita_raw ?? ""),
    diametro_cm: parseNumeroOrEmpty(c.diametro_raw ?? ""),
    larghezza_cm: parseNumeroOrEmpty(c.larghezza_raw ?? ""),
    altezza_cm: parseNumeroOrEmpty(c.altezza_raw ?? "")
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

  const macroSel = $("tipoPuntoMacro");
  const currentMacro = state.tipo_punto_macro || "";
  macroSel.value = currentMacro;
  buildTipoPuntoSub(currentMacro.toUpperCase(), state.tipo_punto_sub || "");
  $("tipoPuntoSub").value = state.tipo_punto_sub || "";
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

  $("presenzaTorrino").value = state.manufatto.presenza_torrino || "";
  $("altezzaTorrino").value = state.manufatto.altezza_torrino_cm || "";

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

  $("profonditaPozzetto").value =
    state.manufatto.profondita_pozzetto_cm === "" || state.manufatto.profondita_pozzetto_cm == null
      ? ""
      : String(state.manufatto.profondita_pozzetto_cm);

  $("altroPozzetto").value = state.manufatto.altro_pozzetto || "";

  $("ristagno").value = state.manufatto.ristagno_cm || "";
  $("appoggioAccesso").value = state.manufatto.appoggio_accesso || "";
  $("presenzaSedimenti").value = state.manufatto.presenza_sedimenti || "";
  $("profonditaSoglia").value = state.manufatto.profondita_soglia_cm || "";
  $("noteCondizioni").value = state.manufatto.note_condizioni || "";

  renderCondotte();
  renderFotos();

  // ✅ forza comportamento coerente su tutti i campi numerici
  wireNumericTextInputs();
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

  // ✅ mostro in minuscolo e salvo in minuscolo (value)
  macrosSorted.forEach((m) => {
    const o = document.createElement("option");
    o.value = m.toLowerCase();
    o.textContent = m.toLowerCase();
    macroSel.appendChild(o);
  });

  macroSel.addEventListener("change", () => {
    buildTipoPuntoSub(macroSel.value.toUpperCase(), "");
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

  refreshTipologiaFognaturaVisibility();

  buildTipoPuntoSub("", "");
  writeStateToForm();
  renderCondotte();
  renderFotos();

  // ✅ fondamentale per tastiera e validazione live
  wireNumericTextInputs();
})();
