// Choix de la période, partagé entre le panneau claude.ai (claude-button.js) et la fenêtre (popup.js).
// L'extension ne garde que la date du dernier envoi (pour proposer « Depuis mon dernier envoi ») et la langue (i18n.js).
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

// Dates lisibles dans la langue choisie : 6/10 ou Oct 6, 06/10/2026 ou October 6, 2026.
function shortDate(iso) {
  const [, m, d] = iso.split("-");
  return LANG === "fr" ? `${d}/${m}` : `${t("months")[m - 1].slice(0, 3)} ${Number(d)}`;
}
function longDate(iso) {
  const [y, m, d] = iso.split("-");
  return LANG === "fr" ? `${d}/${m}/${y}` : `${t("months")[m - 1]} ${Number(d)}, ${y}`;
}

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
    const prev = Object.assign(document.createElement("button"), { type: "button", textContent: "‹", title: t("prevMonth") });
    const next = Object.assign(document.createElement("button"), { type: "button", textContent: "›", title: t("nextMonth") });
    prev.disabled = year * 12 + month <= earliest.getFullYear() * 12 + earliest.getMonth();
    next.disabled = year * 12 + month >= now.getFullYear() * 12 + now.getMonth();
    prev.onclick = () => { month--; if (month < 0) { month = 11; year--; } render(); };
    next.onclick = () => { month++; if (month > 11) { month = 0; year++; } render(); };
    const label = document.createElement("span");
    label.textContent = `${t("months")[month]} ${year}`;
    head.append(prev, label, next);

    const grid = document.createElement("div");
    grid.className = "grid";
    for (const wd of t("weekdays")) {
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
      ? t("since", { date: longDate(selected), n: daysSince(selected), s: daysSince(selected) > 1 ? "s" : "" })
      : t("pickStart");

    el.className = "gc-cal";
    el.replaceChildren(style, head, grid, foot);
  }
  render();
}

// Remplit le <select> de période et gère le calendrier. Renvoie resolveDays(), qui donne le
// nombre de jours à récupérer ou lève une erreur lisible. Peut être rappelé après un changement de langue.
async function setupPeriodPicker(select, calendarEl) {
  const last = await getLastExport();
  const options = [
    last && ["since-last", t("sinceLast", { date: shortDate(last) })],
    ["1", t("today")],
    ["7", t("last7")],
    ["28", t("last28")],
    ["90", t("last90")],
    ["180", t("last180")],
    ["365", t("last365")],
    ["custom", t("custom")],
  ].filter(Boolean);
  const previous = select.value;
  select.replaceChildren(...options.map(([value, label]) => new Option(label, value)));
  select.value = options.some(([value]) => value === previous) ? previous : last ? "since-last" : "28";

  let picked = null;
  mountCalendar(calendarEl, (iso) => (picked = iso));
  const sync = () => (calendarEl.hidden = select.value !== "custom");
  select.onchange = sync;
  sync();

  return function resolveDays() {
    if (select.value === "since-last") return daysSince(last);
    if (select.value === "custom") {
      if (!picked) throw new Error(t("pickError"));
      return daysSince(picked);
    }
    return Number(select.value);
  };
}
