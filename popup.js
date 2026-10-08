const $ = (id) => document.getElementById(id);

function setStatus(text, { error = false, busy = false } = {}) {
  $("status").replaceChildren();
  if (busy) {
    const spinner = document.createElement("span");
    spinner.className = "spinner";
    $("status").append(spinner);
  }
  $("status").append(text);
  $("status").className = error ? "error" : "";
}

function setProgress(done, total) {
  $("progress").hidden = false;
  $("progress-bar").style.width = `${total ? Math.round((done / total) * 100) : 0}%`;
}

let resolveDays = () => 28;

// Langue : anglais par défaut, FR au choix (même réglage que le panneau dans claude.ai).
async function showLang() {
  document.documentElement.lang = LANG;
  document.title = $("title").textContent = t("appName");
  applyTexts(document);
  document.querySelectorAll(".lang button").forEach((b) => b.classList.toggle("on", b.dataset.lang === LANG));
  resolveDays = await setupPeriodPicker($("days"), $("since"));
}
document.querySelectorAll(".lang button").forEach((b) =>
  b.addEventListener("click", async () => {
    await saveLang(b.dataset.lang);
    await showLang();
  })
);
loadLang().then(showLang);

$("go").addEventListener("click", async () => {
  let days;
  try {
    days = resolveDays();
  } catch (e) {
    setStatus(e.message, { error: true });
    return;
  }
  const options = {
    days,
    activities: $("activities").checked,
    sport: $("sport").value,
    details: $("details").checked,
    stress: $("stress").checked,
    cycle: $("cycle").checked,
    daily: $("daily").checked,
    fitness: $("fitness").checked,
    lang: LANG,
  };
  $("go").disabled = true;
  $("result").hidden = true;
  setProgress(0, 1);
  setStatus(t("connecting"), { busy: true });

  try {
    const result = await runCollection(options, (p) => {
      setProgress(p.done, p.total);
      setStatus(`${p.label} (${Math.round((p.done / p.total) * 100)} %)`, { busy: true });
    });
    $("output").value = result.markdown;
    await rememberExport();
    $("result").hidden = false;
    setProgress(1, 1);
    setStatus(result.warnings ? t("doneMissing", { n: result.warnings }) : t("done"));
  } catch (e) {
    $("progress").hidden = true;
    setStatus(e.message, { error: true });
  } finally {
    $("go").disabled = false;
  }
});

$("copy").addEventListener("click", async () => {
  await navigator.clipboard.writeText($("output").value);
  $("copy").textContent = t("copied");
  setTimeout(() => ($("copy").textContent = t("copy")), 1500);
});

$("download").addEventListener("click", () => {
  const blob = new Blob([$("output").value], { type: "text/markdown" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `garmin-${new Date().toISOString().slice(0, 10)}.md`;
  a.click();
  URL.revokeObjectURL(a.href);
});
