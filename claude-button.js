// Bouton « Garmin » dans claude.ai : récupère les données et les joint au message en cours.
(() => {
  if (document.getElementById("garmin-for-claude")) return;

  const host = document.createElement("div");
  host.id = "garmin-for-claude";
  host.style.cssText = "position:fixed;right:20px;bottom:110px;z-index:2147483647";
  // Shadow DOM : le style de claude.ai ne touche pas au nôtre, et inversement.
  const root = host.attachShadow({ mode: "open" });
  root.innerHTML = `
    <style>
      * { box-sizing: border-box; font: 13px/1.4 system-ui, sans-serif; }
      .fab { display: flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 999px; border: 0;
             background: #0891b2; color: #fff; font-weight: 600; cursor: pointer; box-shadow: 0 4px 14px rgba(0,0,0,.2); }
      .fab:hover { background: #0e7490; }
      .panel { position: absolute; right: 0; bottom: 48px; width: 280px; padding: 14px; border-radius: 12px;
               background: #fff; color: #1a1a1a; box-shadow: 0 8px 32px rgba(0,0,0,.25); }
      .panel h2 { margin: 0 0 10px; font-size: 14px; font-weight: 600; }
      .field { display: block; margin-bottom: 8px; color: #555; }
      .field select { display: block; width: 100%; margin-top: 3px; padding: 6px; border-radius: 8px; border: 1px solid #ddd;
               background: #fff; color: #1a1a1a; }
      .check { display: flex; gap: 6px; align-items: flex-start; margin: 4px 0 10px; color: #1a1a1a; cursor: pointer; }
      .go { width: 100%; padding: 9px; border-radius: 8px; border: 0; background: #0891b2; color: #fff; font-weight: 600; cursor: pointer; }
      .go:disabled { opacity: .5; cursor: default; }
      .actions button { flex: 1; padding: 8px 4px; border-radius: 8px; border: 1px solid #ddd;
               background: #fff; color: #1a1a1a; cursor: pointer; }
      .actions button:hover { border-color: #0891b2; }
      .bar { height: 6px; margin-top: 12px; background: #eee; border-radius: 3px; overflow: hidden; }
      .bar div { height: 100%; width: 0; background: #0891b2; transition: width .3s; }
      .status { display: flex; align-items: center; gap: 8px; margin-top: 8px; color: #555; }
      .status.error { color: #b00020; }
      .status.ok { color: #1b7f3b; }
      .spinner { width: 14px; height: 14px; flex: none; border: 2px solid #eee; border-top-color: #0891b2;
                 border-radius: 50%; animation: spin .8s linear infinite; }
      @keyframes spin { to { transform: rotate(360deg); } }
      .actions { display: flex; gap: 6px; margin-top: 10px; }
      [hidden] { display: none !important; }
    </style>
    <div class="panel" hidden>
      <h2>Ajouter mes données Garmin</h2>
      <label class="field">Période
        <select class="days"></select>
      </label>
      <div class="since" hidden></div>
      <label class="field">Activités
        <select class="sport">
          <option value="all">Toutes</option>
          <option value="running">Course</option>
          <option value="strength">Muscu</option>
          <option value="cycling">Vélo</option>
          <option value="swimming">Natation</option>
          <option value="walking">Marche / rando</option>
        </select>
      </label>
      <label class="check"><input type="checkbox" class="details"> Détail de chaque séance (tours, zones, séries)</label>
      <label class="check"><input type="checkbox" class="stress" checked> Stress détaillé (heure par heure, répartition, journal)</label>
      <label class="check"><input type="checkbox" class="cycle"> Cycle menstruel (si suivi dans Garmin)</label>
      <button class="go">Ajouter à la conversation</button>
      <div class="bar" hidden><div></div></div>
      <div class="status" hidden></div>
      <div class="actions" hidden>
        <button class="copy">Copier le texte</button>
      </div>
    </div>
    <button class="fab" title="Ajouter mes données Garmin à la conversation">⌚ Garmin</button>
  `;
  document.body.append(host);

  const $ = (sel) => root.querySelector(sel);
  const panel = $(".panel");
  const bar = $(".bar");
  const status = $(".status");
  const actions = $(".actions");
  let busy = false;
  let lastMarkdown = "";
  let resolveDays = () => 28;
  setupPeriodPicker($(".days"), $(".since")).then((fn) => (resolveDays = fn));

  function setStatus(text, kind = "") {
    status.hidden = false;
    status.className = `status ${kind}`;
    status.replaceChildren();
    if (kind === "busy") {
      const s = document.createElement("span");
      s.className = "spinner";
      status.append(s);
    }
    status.append(text);
  }
  function setProgress(done, total) {
    bar.hidden = false;
    bar.firstElementChild.style.width = `${total ? Math.round((done / total) * 100) : 0}%`;
  }

  $(".fab").addEventListener("click", () => (panel.hidden = !panel.hidden));

  // Joint le fichier au message en cours, comme un glisser-déposer.
  function attachToComposer(file) {
    const dt = new DataTransfer();
    dt.items.add(file);
    const input = document.querySelector('input[type="file"]');
    if (input) {
      input.files = dt.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }
    const editor = document.querySelector('[contenteditable="true"]');
    if (editor) {
      editor.focus();
      editor.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
      return true;
    }
    return false;
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type !== "progress" || !busy) return;
    setProgress(msg.done, msg.total);
    setStatus(`${msg.label} (${Math.round((msg.done / msg.total) * 100)} %)`, "busy");
  });

  $(".go").addEventListener("click", async () => {
      if (busy) return;
      busy = true;
      $(".go").disabled = true;
      actions.hidden = true;
      setProgress(0, 1);
      setStatus("Connexion à Garmin...", "busy");
      try {
        const res = await chrome.runtime.sendMessage({
          type: "collect",
          days: resolveDays(),
          sport: $(".sport").value,
          details: $(".details").checked,
          stress: $(".stress").checked,
          cycle: $(".cycle").checked,
        });
        if (!res?.ok) throw new Error(res?.error || "Erreur inconnue.");
        lastMarkdown = res.markdown;
        setProgress(1, 1);
        const name = `garmin-${new Date().toISOString().slice(0, 10)}.md`;
        const file = new File([res.markdown], name, { type: "text/markdown" });
        if (attachToComposer(file)) {
          await rememberExport();
          setStatus(`Fichier ajouté au message ✓${res.warnings ? ` (${res.warnings} donnée(s) manquante(s))` : ""}`, "ok");
        } else {
          setStatus("Je n'ai pas trouvé la zone de message. Copie le texte et colle-le.", "error");
        }
        actions.hidden = false; // secours si la pièce jointe n'apparaît pas
      } catch (e) {
        bar.hidden = true;
        setStatus(e.message, "error");
      } finally {
        busy = false;
        $(".go").disabled = false;
      }
  });

  $(".copy").addEventListener("click", async () => {
    await navigator.clipboard.writeText(lastMarkdown);
    $(".copy").textContent = "Copié ! Colle avec Cmd+V";
  });
})();
