importScripts("collector.js");

// Le bouton dans claude.ai (claude-button.js) demande une récupération :
// on la lance dans l'onglet Garmin et on renvoie l'avancement puis le résultat.
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type !== "collect") return;
  const tabId = sender.tab.id;
  const options = { days: msg.days, sport: msg.sport, details: msg.details, stress: msg.stress, cycle: msg.cycle };
  runCollection(options, (p) => chrome.tabs.sendMessage(tabId, { type: "progress", ...p }).catch(() => {}))
    .then((result) => sendResponse({ ok: true, ...result }))
    .catch((e) => sendResponse({ ok: false, error: e.message }));
  return true; // réponse asynchrone
});
