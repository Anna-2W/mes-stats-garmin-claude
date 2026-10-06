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

// Remplit le <select> de période et gère le champ date. Renvoie resolveDays(), qui donne le
// nombre de jours à récupérer ou lève une erreur lisible.
async function setupPeriodPicker(select, dateInput) {
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

  dateInput.max = isoToday();
  // Ouvre le calendrier de Chrome : plus simple que de taper jj/mm/aaaa.
  const openCalendar = () => {
    try {
      dateInput.showPicker();
    } catch {
      dateInput.focus(); // navigateur sans showPicker : on garde la saisie au clavier
    }
  };
  const syncDate = () => (dateInput.hidden = select.value !== "custom");
  select.addEventListener("change", () => {
    syncDate();
    if (select.value === "custom") openCalendar();
  });
  dateInput.addEventListener("click", openCalendar);
  syncDate();

  return function resolveDays() {
    if (select.value === "since-last") return daysSince(last);
    if (select.value === "custom") {
      if (!dateInput.value) throw new Error("Choisis une date de début.");
      const days = daysSince(dateInput.value);
      if (days < 1) throw new Error("La date de début est dans le futur.");
      if (days > MAX_DAYS) throw new Error("Maximum 1 an en arrière.");
      return days;
    }
    return Number(select.value);
  };
}
