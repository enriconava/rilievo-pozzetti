if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./service-worker.js");
}

const $ = (id) => document.getElementById(id);

/* ===== Stato ===== */
let state = {
  condotte: []
};

/* ===== Helpers ===== */
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

function parseNumeroOrEmpty(val) {
  const v = (val ?? "").toString().trim();
  if (!v) return "";
  if (!/^\d+(\.\d+)?$/.test(v)) return "";
  const n = Number(v);
  return Number.isFinite(n) ? n : "";
}

/* ===== Tabelle ===== */
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

const DIREZIONE_CONDOTTA = ["Entrante", "Uscente", "Attraversamento"];
const TIP_FOGNATURA = ["Bianca", "Nera", "Mista", "Sfiorata"];
const MATERIALI_LIST = ["CLS", "PVC", "Ghisa", "PEAD"];
const SEZIONI_LIST = ["Circolare", "Ovoidale", "Rettangolare"];
const COLORI_TUBAZIONI = ["Grigio", "Nero", "Marrone"];

/* ===== Riga condotta ===== */
function condottaRowTemplate(row, idx) {
  const tr = document.createElement("tr");
  const td = (child) => {
    const x = document.createElement("td");
    x.appendChild(child);
    return x;
  };

  const idSchema = makeSelect(ID_SCHEMA_OPTS);
  idSchema.value = row.id_schema ?? "";

  const dirSel = makeSelect(DIREZIONE_CONDOTTA);
  dirSel.value = row.direzione ?? "";

  const tipWrap = document.createElement("div");
  const tipSel = makeSelect(TIP_FOGNATURA, "— Seleziona —", true);
  tipSel.value = row.tipologia ?? "";
  const tipAlt = makeAltroInput("Specificare tipologia");
  tipAlt.value = row.tipologia_altro ?? "";
  wireAltro(tipSel, tipAlt);
  tipWrap.appendChild(tipSel);
  tipWrap.appendChild(tipAlt);

  const prof = document.createElement("input");
  prof.type = "text";
  prof.placeholder = "es. 120";
  prof.value = row.profondita_raw ?? "";
  prof.dataset.decimal = "1";

  const diam = document.createElement("input");
  diam.type = "text";
  diam.placeholder = "es. 30";
  diam.value = row.diametro_raw ?? "";

  const larg = document.createElement("input");
  larg.type = "text";
  larg.placeholder = "es. 40";
  larg.value = row.larghezza_raw ?? "";

  const alt = document.createElement("input");
  alt.type = "text";
  alt.placeholder = "es. 40";
  alt.value = row.altezza_raw ?? "";

  const matWrap = document.createElement("div");
  const matSel = makeSelect(MATERIALI_LIST, "— Seleziona —", true);
  matSel.value = row.materiale ?? "";
  const matAlt = makeAltroInput("Specificare materiale");
  matAlt.value = row.materiale_altro ?? "";
  wireAltro(matSel, matAlt);
  matWrap.appendChild(matSel);
  matWrap.appendChild(matAlt);

  const sezWrap = document.createElement("div");
  const sezSel = makeSelect(SEZIONI_LIST, "— Seleziona —", true);
  sezSel.value = row.sezione ?? "";
  const sezAlt = makeAltroInput("Specificare sezione");
  sezAlt.value = row.sezione_altro ?? "";
  wireAltro(sezSel, sezAlt);
  sezWrap.appendChild(sezSel);
  sezWrap.appendChild(sezAlt);

  const colWrap = document.createElement("div");
  const colSel = makeSelect(COLORI_TUBAZIONI, "— Seleziona —", true);
  colSel.value = row.colore ?? "";
  const colAlt = makeAltroInput("Specificare colore");
  colAlt.value = row.colore_altro ?? "";
  wireAltro(colSel, colAlt);
  colWrap.appendChild(colSel);
  colWrap.appendChild(colAlt);

  const btnDel = document.createElement("button");
  btnDel.textContent = "Rimuovi";
  btnDel.onclick = () => {
    state.condotte.splice(idx, 1);
    renderCondotte();
  };

  prof.oninput = () => (state.condotte[idx].profondita_raw = prof.value);
  diam.oninput = () => (state.condotte[idx].diametro_raw = diam.value);
  larg.oninput = () => (state.condotte[idx].larghezza_raw = larg.value);
  alt.oninput = () => (state.condotte[idx].altezza_raw = alt.value);

  tr.append(
    td(idSchema),
    td(dirSel),
    td(tipWrap),
    td(prof),
    td(diam),
    td(larg),
    td(alt),
    td(matWrap),
    td(sezWrap),
    td(colWrap),
    td(btnDel)
  );

  return tr;
}

/* ===== Render ===== */
function renderCondotte() {
  const tbody = $("tblCondotte").querySelector("tbody");
  tbody.innerHTML = "";
  state.condotte.forEach((row, idx) => {
    tbody.appendChild(condottaRowTemplate(row, idx));
  });
}

/* ===== Bottoni ===== */
$("btnAddCondotta").onclick = () => {
  state.condotte.push({
    id_schema: "",
    direzione: "",
    tipologia: "",
    tipologia_altro: "",
    profondita_raw: "",
    profondita_cm: "",
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
};

$("btnClearCondotte").onclick = () => {
  state.condotte = [];
  renderCondotte();
};
