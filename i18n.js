// Textes de l'extension en anglais (par défaut) et en français. Chargé par le panneau claude.ai,
// la fenêtre de l'extension et le service worker. Le choix de langue est gardé dans chrome.storage.local.
const LANG_KEY = "lang";
const DEFAULT_LANG = "en";
let LANG = DEFAULT_LANG;

const UI_TEXT = {
  en: {
    appName: "My Garmin Stats for ChatGPT/Claude",
    panelTitle: "Add my Garmin data",
    fabTitle: "Add my Garmin data to the conversation",
    period: "Period",
    data: "Data",
    activities: "Activities",
    sportAll: "All",
    sportRunning: "Running",
    sportStrength: "Strength",
    sportCycling: "Cycling",
    sportSwimming: "Swimming",
    sportWalking: "Walking / hiking",
    details: "Details of each session (laps, zones, sets)",
    stress: "Detailed stress (breakdown, 3-min readings over 90 days, journal)",
    cycle: "Menstrual cycle (if tracked in Garmin)",
    daily: "Days (sleep, HRV, resting HR, stress, Body Battery)",
    fitness: "Fitness status (VO2 max, status, predictions)",
    go: "Add to conversation",
    popupGo: "Get my data",
    copyText: "Copy text",
    copiedPaste: "Copied! Paste with Cmd+V",
    copy: "Copy",
    copied: "Copied!",
    download: "Download .md",
    pasteNote: "Paste the text or drop the file into a Claude or ChatGPT conversation.",
    loginNote: "You must be signed in to connect.garmin.com in this browser. Nothing is sent anywhere else.",
    connecting: "Connecting to Garmin...",
    unknownError: "Unknown error.",
    reloadPage: "The extension was updated: reload this page, then try again.",
    attached: "File added to the message ✓",
    missing: " ({n} missing item(s))",
    noComposer: "I couldn't find the message box. Copy the text and paste it.",
    done: "Done.",
    doneMissing: "Done, {n} missing item(s).",
    errNotLoggedIn: "Sign in to connect.garmin.com first (in this browser), then try again.",
    errNothing: "Garmin returned nothing. Reload connect.garmin.com and try again.",
    sinceLast: "Since my last export ({date})",
    today: "Today",
    last7: "Last 7 days",
    last28: "Last 4 weeks",
    last90: "Last 3 months",
    last180: "Last 6 months",
    last365: "1 year",
    custom: "Since a date...",
    months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    weekdays: ["M", "T", "W", "T", "F", "S", "S"],
    prevMonth: "Previous month",
    nextMonth: "Next month",
    pickStart: "Pick the start day",
    pickError: "Pick the start day in the calendar.",
    since: "Since {date} ({n} day{s})",
  },
  fr: {
    appName: "Mes Stats Garmin pour ChatGPT/Claude",
    panelTitle: "Ajouter mes données Garmin",
    fabTitle: "Ajouter mes données Garmin à la conversation",
    period: "Période",
    data: "Données",
    activities: "Activités",
    sportAll: "Toutes",
    sportRunning: "Course",
    sportStrength: "Muscu",
    sportCycling: "Vélo",
    sportSwimming: "Natation",
    sportWalking: "Marche / rando",
    details: "Détail de chaque séance (tours, zones, séries)",
    stress: "Stress détaillé (répartition, mesures toutes les 3 min sur 90 jours, journal)",
    cycle: "Cycle menstruel (si suivi dans Garmin)",
    daily: "Journées (sommeil, HRV, FC repos, stress, Body Battery)",
    fitness: "État de forme (VO2 max, statut, prédictions)",
    go: "Ajouter à la conversation",
    popupGo: "Récupérer mes données",
    copyText: "Copier le texte",
    copiedPaste: "Copié ! Colle avec Cmd+V",
    copy: "Copier",
    copied: "Copié !",
    download: "Télécharger .md",
    pasteNote: "Colle le texte ou glisse le fichier dans une conversation Claude ou ChatGPT.",
    loginNote: "Tu dois être connecté·e à connect.garmin.com dans ce navigateur. Rien n'est envoyé ailleurs.",
    connecting: "Connexion à Garmin...",
    unknownError: "Erreur inconnue.",
    reloadPage: "L'extension a été mise à jour : recharge cette page, puis réessaie.",
    attached: "Fichier ajouté au message ✓",
    missing: " ({n} donnée(s) manquante(s))",
    noComposer: "Je n'ai pas trouvé la zone de message. Copie le texte et colle-le.",
    done: "Terminé.",
    doneMissing: "Terminé, {n} donnée(s) manquante(s).",
    errNotLoggedIn: "Connecte-toi d'abord sur connect.garmin.com (dans ce navigateur), puis réessaie.",
    errNothing: "Garmin n'a rien renvoyé. Recharge connect.garmin.com et réessaie.",
    sinceLast: "Depuis mon dernier envoi ({date})",
    today: "Aujourd'hui",
    last7: "7 derniers jours",
    last28: "4 dernières semaines",
    last90: "3 derniers mois",
    last180: "6 derniers mois",
    last365: "1 an",
    custom: "Depuis une date...",
    months: ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"],
    weekdays: ["L", "M", "M", "J", "V", "S", "D"],
    prevMonth: "Mois précédent",
    nextMonth: "Mois suivant",
    pickStart: "Choisis le jour de départ",
    pickError: "Choisis le jour de départ dans le calendrier.",
    since: "Depuis le {date} ({n} jour{s})",
  },
};

// Textes du fichier envoyé à Claude. Passés tels quels à collectGarminData, qui tourne dans la page Garmin :
// uniquement des chaînes, avec des {variables} remplacées là-bas.
const EXPORT_TEXT = {
  en: {
    title: "# My Garmin data from {start} to {end}{sport}",
    intro: "Exported from Garmin Connect on {date}. Distances in km, activity durations in h:min:s or min:s, sleep in h:min, HR in bpm.",
    sports: { running: "Running", strength: "Strength", cycling: "Cycling", swimming: "Swimming", walking: "Walking / hiking" },
    errSession: "Garmin session not found: reload connect.garmin.com and sign in again.",
    errAccess: "Garmin refused access ({e}). Reload connect.garmin.com and try again.",
    progProfile: "Profile",
    progFitness: "Fitness status",
    progActivities: "Activities",
    progDetails: "Session details {i}/{n}",
    progDays: "Days {i}/{n}",
    fitnessTitle: "## Current fitness status",
    vo2: "- Running VO2 max: {run}{bike}",
    vo2Bike: ", cycling: {v}",
    trainingStatus: "- Training status: {v}",
    load: "- Acute load (7 d): {acute}, chronic (28 d): {chronic}, ratio: {ratio}",
    balance: "- Monthly load: low aerobic {low}, high aerobic {high}, anaerobic {anaerobic} ({feedback})",
    races: "- Race predictions: 5 km {k5}, 10 km {k10}, half marathon {half}, marathon {full}",
    activitiesTitle: "## Activities ({n})",
    activitiesHeader: "| Date | Type | Name | Distance | Duration | Pace / speed | Avg HR | Max HR | Elev. gain (m) | Aerobic TE | Anaerobic TE | Load | Calories |",
    detailsTitle: "## Session details",
    zones: "- HR zones: {v}",
    dynamics: "- Dynamics: {v}",
    cadence: "cadence {v} spm",
    stride: "stride {v} m",
    groundContact: "ground contact {v} ms",
    oscillation: "vertical oscillation {v} cm",
    verticalRatio: "vertical ratio {v} %",
    power: "power {v} W",
    weather: "- Weather: {v}",
    humidity: "humidity {v} %",
    wind: "wind {v} km/h",
    lapsHeader: "| Lap | Distance | Duration | Pace / speed | Avg HR | Max HR | Cadence | Elev. gain (m) |",
    setsHeader: "| Set | Exercise | Reps | Weight | Duration |",
    daysTitle: "## Days",
    daysHeader: "| Date | Bedtime | Wake-up | Sleep | Sleep score | Deep | REM | Overnight HRV (ms) | HRV status | Resting HR | Avg stress | Body Battery max / min | Readiness | Steps |",
    stressTitle: "## Stress (0 to 100)",
    stressHeader: "| Date | Average | Max | Rest | Low | Medium | High | During sleep |",
    rawStressTitle: "### Stress readings on {date} (every 3 min, local time of the first reading, then values)",
    journalTitle: "### Garmin journal",
    journalLine: "- {date}: {v}",
    journalLifestyle: "lifestyle: {v}",
    journalCycle: "cycle: {v}",
  },
  fr: {
    title: "# Mes données Garmin du {start} au {end}{sport}",
    intro: "Export depuis Garmin Connect le {date}. Distances en km, durées d'activité en h:min:s ou min:s, sommeil en h:min, FC en bpm.",
    sports: { running: "Course", strength: "Muscu", cycling: "Vélo", swimming: "Natation", walking: "Marche / rando" },
    errSession: "Session Garmin introuvable : recharge connect.garmin.com et reconnecte-toi.",
    errAccess: "Garmin refuse l'accès ({e}). Recharge connect.garmin.com et réessaie.",
    progProfile: "Profil",
    progFitness: "État de forme",
    progActivities: "Activités",
    progDetails: "Détail des séances {i}/{n}",
    progDays: "Journées {i}/{n}",
    fitnessTitle: "## État de forme actuel",
    vo2: "- VO2 max course : {run}{bike}",
    vo2Bike: ", vélo : {v}",
    trainingStatus: "- Statut d'entraînement : {v}",
    load: "- Charge aiguë (7 j) : {acute}, chronique (28 j) : {chronic}, ratio : {ratio}",
    balance: "- Charge mensuelle : aérobie basse {low}, aérobie haute {high}, anaérobie {anaerobic} ({feedback})",
    races: "- Prédictions : 5 km {k5}, 10 km {k10}, semi {half}, marathon {full}",
    activitiesTitle: "## Activités ({n})",
    activitiesHeader: "| Date | Type | Nom | Distance | Durée | Allure / vitesse | FC moy | FC max | D+ (m) | TE aéro | TE anaéro | Charge | Calories |",
    detailsTitle: "## Détail des séances",
    zones: "- Zones cardio : {v}",
    dynamics: "- Dynamique : {v}",
    cadence: "cadence {v} pas/min",
    stride: "foulée {v} m",
    groundContact: "contact au sol {v} ms",
    oscillation: "oscillation {v} cm",
    verticalRatio: "ratio vertical {v} %",
    power: "puissance {v} W",
    weather: "- Météo : {v}",
    humidity: "humidité {v} %",
    wind: "vent {v} km/h",
    lapsHeader: "| Tour | Distance | Durée | Allure / vitesse | FC moy | FC max | Cadence | D+ (m) |",
    setsHeader: "| Série | Exercice | Répétitions | Charge | Durée |",
    daysTitle: "## Journées",
    daysHeader: "| Date | Coucher | Réveil | Sommeil | Score sommeil | Profond | REM | HRV nuit (ms) | Statut HRV | FC repos | Stress moy | Body Battery max / min | Readiness | Pas |",
    stressTitle: "## Stress (0 à 100)",
    stressHeader: "| Date | Moyenne | Max | Repos | Faible | Moyen | Élevé | Pendant le sommeil |",
    rawStressTitle: "### Mesures de stress du {date} (toutes les 3 min, heure locale de la première mesure puis valeurs)",
    journalTitle: "### Journal Garmin",
    journalLine: "- {date} : {v}",
    journalLifestyle: "lifestyle : {v}",
    journalCycle: "cycle : {v}",
  },
};

// t("since", { date, n }) : texte dans la langue choisie, {variables} remplacées.
function t(key, vars, lang = LANG) {
  const text = (UI_TEXT[lang] ?? UI_TEXT[DEFAULT_LANG])[key] ?? UI_TEXT[DEFAULT_LANG][key] ?? key;
  return typeof text === "string" ? text.replace(/\{(\w+)\}/g, (_, k) => vars?.[k] ?? "") : text;
}

async function loadLang() {
  try {
    const saved = (await chrome.storage.local.get(LANG_KEY))[LANG_KEY];
    if (UI_TEXT[saved]) LANG = saved;
  } catch {
    // stockage indisponible : on reste en anglais
  }
  return LANG;
}

async function saveLang(lang) {
  LANG = UI_TEXT[lang] ? lang : DEFAULT_LANG;
  try {
    await chrome.storage.local.set({ [LANG_KEY]: LANG });
  } catch {
    // le choix ne sera simplement pas retenu
  }
}

// Remplit tous les éléments marqués data-i18n (texte) ou data-i18n-title (infobulle) sous root.
function applyTexts(root) {
  root.querySelectorAll("[data-i18n]").forEach((el) => (el.textContent = t(el.dataset.i18n)));
  root.querySelectorAll("[data-i18n-title]").forEach((el) => (el.title = t(el.dataset.i18nTitle)));
}
