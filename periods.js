// Choix de la période, partagé entre le panneau claude.ai (claude-button.js) et la fenêtre (popup.js).
// La seule chose que l'extension garde : la date du dernier envoi, pour proposer « Depuis mon dernier envoi ».
const LAST_EXPORT_KEY = "lastExportDate";
const MAX_DAYS = 365;

function isoToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Nombre de jours de isoDate à aujourd'hui, les deux inclus.
function daysSince(isoDate) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((today - new Date(y, m - 1, d)) / 86400000) + 1;
}

async function getLastExport() {
  try {
    return (await chrome.storage.local.get(LAST_EXPORT_KEY))[LAST_EXPORT_KEY] ?? null;
  } catch {
    return null;
  }
}

async function rememberExport() {
  try {
    await chrome.storage.local.set({ [LAST_EXPORT_KEY]: isoToday() });
  } catch {
    // pas grave : l'option « depuis le dernier envoi » ne sera simplement pas proposée
  }
}

const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const CALENDAR_CSS = `
  .gc-cal { margin: 6px 0 2px; padding: 8px; border: 1px solid #ddd; border-radius: 8px; background: #fff; color: #1a1a1a;
            font: 12px/1.3 system-ui, sans-serif; user-select: none; }
  .gc-cal .head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; font-weight: 600; }
  .gc-cal .head button { width: 28px; height: 28px; border: 0; border-radius: 6px; background: none; font-size: 16px; cursor: pointer; color: #0e7490; }
  .gc-cal .head button:hover:not(:disabled) { background: #e6f6f9; }
  .gc-cal .head button:disabled { color: #ccc; cursor: default; }
  .gc-cal .grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; text-align: center; }
  .gc-cal .wd { color: #888; font-size: 11px; padding: 2px 0; }
  .gc-cal .day { padding: 5px 0; border: 0; border-radius: 6px; background: none; cursor: pointer; font: inherit; color: inherit; }
  .gc-cal .day:hover:not(:disabled) { background: #e6f6f9; }
  .gc-cal .day:disabled { color: #ccc; cursor: default; }
  .gc-cal .day.today { font-weight: 700; color: #0e7490; }
  .gc-cal .day.sel { background: #0891b2; color: #fff; font-weight: 600; }
  .gc-cal .foot { margin-top: 6px; color: #555; text-align: center; }
`;

// Petit calendrier maison (le sélecteur natif de Chrome ne s'ouvre pas dans le panneau de claude.ai).
// Les jours futurs et ceux de plus d'un an sont grisés. onPick(iso) est appelé à chaque choix.
function mountCalendar(el, onPick) {
  const pad = (n) => String(n).padStart(2, "0");
  const today = isoToday();
  const now = new Date();
  const earliest = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (MAX_DAYS - 1));
  const earliestIso = `${earliest.getFullYear()}-${pad(earliest.getMonth() + 1)}-${pad(earliest.getDate())}`;
  let year = now.getFullYear();
  let month = now.getMonth();
  let selected = null;

  function render() {
    const style = document.createElement("style");
    style.textContent = CALENDAR_CSS;
    const head = document.createElement("div");
    head.className = "head";
    const prev = Object.assign(document.createElement("button"), { type: "button", textContent: "‹", title: "Mois précédent" });
    const next = Object.assign(document.createElement("button"), { type: "button", textContent: "›", title: "Mois suivant" });
    prev.disabled = year * 12 + month <= earliest.getFullYear() * 12 + earliest.getMonth();
    next.disabled = year * 12 + month >= now.getFullYear() * 12 + now.getMonth();
    prev.onclick = () => { month--; if (month < 0) { month = 11; year--; } render(); };
    next.onclick = () => { month++; if (month > 11) { month = 0; year++; } render(); };
    const label = document.createElement("span");
    label.textContent = `${MONTHS[month]} ${year}`;
    head.append(prev, label, next);

    const grid = document.createElement("div");
    grid.className = "grid";
    for (const wd of ["L", "M", "M", "J", "V", "S", "D"]) {
      grid.append(Object.assign(document.createElement("div"), { className: "wd", textContent: wd }));
    }
    const offset = (new Date(year, month, 1).getDay() + 6) % 7; // semaine commençant lundi
    for (let i = 0; i < offset; i++) grid.append(document.createElement("div"));
    const count = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= count; d++) {
      const iso = `${year}-${pad(month + 1)}-${pad(d)}`;
      const b = Object.assign(document.createElement("button"), { type: "button", textContent: d, className: "day" });
      if (iso === today) b.classList.add("today");
      if (iso === selected) b.classList.add("sel");
      b.disabled = iso > today || iso < earliestIso;
      b.onclick = () => { selected = iso; onPick(iso); render(); };
      grid.append(b);
    }

    const foot = document.createElement("div");
    foot.className = "foot";
    foot.textContent = selected
      ? `Depuis le ${selected.slice(8, 10)}/${selected.slice(5, 7)}/${selected.slice(0, 4)} (${daysSince(selected)} jour${daysSince(selected) > 1 ? "s" : ""})`
      : "Choisis le jour de départ";

    el.className = "gc-cal";
    el.replaceChildren(style, head, grid, foot);
  }
  render();
}

// Remplit le <select> de période et gère le calendrier. Renvoie resolveDays(), qui donne le
// nombre de jours à récupérer ou lève une erreur lisible.
async function setupPeriodPicker(select, calendarEl) {
  const last = await getLastExport();
  const options = [
    last && ["since-last", `Depuis mon dernier envoi (${last.slice(8, 10)}/${last.slice(5, 7)})`],
    ["1", "Aujourd'hui"],
    ["7", "7 derniers jours"],
    ["28", "4 dernières semaines"],
    ["90", "3 derniers mois"],
    ["180", "6 derniers mois"],
    ["365", "1 an"],
    ["custom", "Depuis une date..."],
  ].filter(Boolean);
  select.replaceChildren(...options.map(([value, label]) => new Option(label, value)));
  select.value = last ? "since-last" : "28";

  let picked = null;
  mountCalendar(calendarEl, (iso) => (picked = iso));
  const sync = () => (calendarEl.hidden = select.value !== "custom");
  select.addEventListener("change", sync);
  sync();

  return function resolveDays() {
    if (select.value === "since-last") return daysSince(last);
    if (select.value === "custom") {
      if (!picked) throw new Error("Choisis le jour de départ dans le calendrier.");
      return daysSince(picked);
    }
    return Number(select.value);
  };
}
