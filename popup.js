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

$("go").addEventListener("click", async () => {
  const options = {
    days: Number(document.querySelector('input[name="days"]:checked').value),
    activities: $("activities").checked,
    sport: $("sport").value,
    details: $("details").checked,
    daily: $("daily").checked,
    fitness: $("fitness").checked,
  };
  $("go").disabled = true;
  $("result").hidden = true;
  setProgress(0, 1);
  setStatus("Connexion à Garmin...", { busy: true });

  try {
    const result = await runCollection(options, (p) => {
      setProgress(p.done, p.total);
      setStatus(`${p.label} (${Math.round((p.done / p.total) * 100)} %)`, { busy: true });
    });
    $("output").value = result.markdown;
    $("result").hidden = false;
    setProgress(1, 1);
    setStatus(result.warnings ? `Terminé, ${result.warnings} donnée(s) manquante(s).` : "Terminé.");
  } catch (e) {
    $("progress").hidden = true;
    setStatus(e.message, { error: true });
  } finally {
    $("go").disabled = false;
  }
});

$("copy").addEventListener("click", async () => {
  await navigator.clipboard.writeText($("output").value);
  $("copy").textContent = "Copié !";
  setTimeout(() => ($("copy").textContent = "Copier"), 1500);
});

$("download").addEventListener("click", () => {
  const blob = new Blob([$("output").value], { type: "text/markdown" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `garmin-${new Date().toISOString().slice(0, 10)}.md`;
  a.click();
  URL.revokeObjectURL(a.href);
});
