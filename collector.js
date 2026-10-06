// Logique partagée entre la fenêtre de l'extension (popup.js) et le service worker (background.js).
const GARMIN_HOME = "https://connect.garmin.com/modern/";

// Trouve un onglet Garmin Connect ouvert, sinon en ouvre un en arrière-plan.
async function getGarminTab() {
  const [existing] = await chrome.tabs.query({ url: "https://connect.garmin.com/*" });
  if (existing) return existing;
  const tab = await chrome.tabs.create({ url: GARMIN_HOME, active: false });
  await new Promise((resolve) => {
    const listener = (id, info) => {
      if (id === tab.id && info.status === "complete") {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
  });
  return chrome.tabs.get(tab.id);
}

// Lance la récupération dans l'onglet Garmin. onProgress({ done, total, label }) est appelé
// régulièrement. Renvoie { markdown, warnings } ou lève une erreur lisible.
async function runCollection(options, onProgress) {
  const tab = await getGarminTab();
  if (!tab.url?.startsWith("https://connect.garmin.com/")) {
    throw new Error("Connecte-toi d'abord sur connect.garmin.com (dans ce navigateur), puis réessaie.");
  }
  const timer = setInterval(async () => {
    try {
      const [{ result: p }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        world: "MAIN",
        func: () => window.__garminForClaudeProgress ?? null,
      });
      if (p) onProgress(p);
    } catch {
      // onglet en cours de chargement : on réessaie au prochain tour
    }
  }, 300);
  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: "MAIN", // contexte du site : ses cookies et son jeton CSRF
      func: collectGarminData,
      args: [options],
    });
    if (!result) throw new Error("Garmin n'a rien renvoyé. Recharge connect.garmin.com et réessaie.");
    if (result.error) throw new Error(result.error);
    return result;
  } finally {
    clearInterval(timer);
  }
}

// Exécutée DANS la page connect.garmin.com : doit être autonome (aucune variable externe).
// options : days, sport ("all", "running", "strength", ...), details, activities, daily, fitness.
async function collectGarminData({ days, sport = "all", details = false, activities = true, daily = true, fitness = true }) {
  const csrf = document.querySelector('meta[name="csrf-token"]')?.content;
  if (!csrf) return { error: "Session Garmin introuvable : recharge connect.garmin.com et reconnecte-toi." };

  const DETAILED_DAYS = 28; // au-delà, les journées sont résumées par semaine
  const SPORTS = {
    running: { label: "Course", match: /running/ },
    strength: { label: "Muscu", match: /strength/ },
    cycling: { label: "Vélo", match: /cycling|biking/ },
    swimming: { label: "Natation", match: /swim/ },
    walking: { label: "Marche / rando", match: /walking|hiking/ },
  };

  // Avancement lu par l'extension (voir runCollection). total grandit quand on connaît le nombre de séances.
  let total = 1 + (fitness ? 1 : 0) + (activities ? 1 : 0) + (daily ? days : 0);
  let done = 0;
  const step = (label) => {
    window.__garminForClaudeProgress = { done, total, label };
  };
  step("Profil");

  let warnings = 0;
  async function api(path, params) {
    const qs = params ? `?${new URLSearchParams(params)}` : "";
    const r = await fetch(`/gc-api${path}${qs}`, {
      credentials: "include",
      headers: { "connect-csrf-token": csrf, NK: "NT", Accept: "application/json" },
    });
    if (r.status === 204) return null;
    if (!r.ok) throw new Error(`${r.status} ${path}`);
    return r.json();
  }
  async function safe(path, params) {
    try {
      return await api(path, params);
    } catch {
      warnings++;
      return null;
    }
  }
  const pause = (ms) => new Promise((r) => setTimeout(r, ms));
  // Traite une liste par petits paquets, avec une pause, pour ne pas inquiéter Garmin.
  async function inBatches(items, size, fn) {
    const results = [];
    for (let i = 0; i < items.length; i += size) {
      results.push(...(await Promise.all(items.slice(i, i + size).map(fn))));
      if (i + size < items.length) await pause(150);
    }
    return results;
  }

  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const today = new Date();
  const dates = [];
  for (let i = days - 1; i >= 0; i--) dates.push(iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() - i)));
  const startDate = dates[0];
  const endDate = dates[dates.length - 1];

  const dur = (s) => {
    if (s == null || s < 0) return "-";
    s = Math.round(s);
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return h ? `${h}h${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`;
  };
  // Durées de sommeil : à la minute près, sans ambiguïté avec une heure de la journée.
  const hm = (s) => {
    if (s == null || s < 0) return "-";
    const m = Math.round(s / 60);
    return m >= 60 ? `${Math.floor(m / 60)}h${String(m % 60).padStart(2, "0")}` : `${m} min`;
  };
  // Garmin renvoie -1 ou -2 quand il n'y a pas de mesure.
  const num = (v, digits = 0) => (v == null || Number.isNaN(v) || v < 0 ? "-" : Number(v).toFixed(digits));
  const cell = (v) => String(v ?? "-").replace(/\|/g, "/").replace(/\n/g, " ");
  const isFoot = (type) => /running|walking|hiking/.test(type);
  const speed = (type, mps) => (mps > 0 ? (isFoot(type) ? `${dur(1000 / mps)} /km` : `${num(mps * 3.6, 1)} km/h`) : "-");
  const avg = (values) => {
    const ok = values.filter((v) => v != null && v >= 0);
    return ok.length ? ok.reduce((a, b) => a + b, 0) / ok.length : null;
  };

  let profile;
  try {
    profile = await api("/userprofile-service/socialProfile");
  } catch (e) {
    return { error: `Garmin refuse l'accès (${e.message}). Recharge connect.garmin.com et réessaie.` };
  }
  const displayName = profile?.displayName;
  done++;

  const sportLabel = SPORTS[sport]?.label;
  const out = [
    `# Mes données Garmin du ${startDate} au ${endDate}${sportLabel ? ` (${sportLabel})` : ""}`,
    "",
    `Export depuis Garmin Connect le ${iso(today)}. Distances en km, durées d'activité en h:min:s ou min:s, sommeil en h:min, FC en bpm.`,
    "",
  ];

  if (fitness) {
    step("État de forme");
    const [status, races] = await Promise.all([
      safe(`/metrics-service/metrics/trainingstatus/aggregated/${endDate}`),
      displayName ? safe(`/metrics-service/metrics/racepredictions/latest/${displayName}`) : null,
    ]);
    const first = (map) => (map ? Object.values(map)[0] : null);
    const vo2 = status?.mostRecentVO2Max?.generic?.vo2MaxPreciseValue ?? status?.mostRecentVO2Max?.generic?.vo2MaxValue;
    const vo2Bike = status?.mostRecentVO2Max?.cycling?.vo2MaxPreciseValue ?? status?.mostRecentVO2Max?.cycling?.vo2MaxValue;
    const ts = first(status?.mostRecentTrainingStatus?.latestTrainingStatusData);
    const load = ts?.acuteTrainingLoadDTO;
    const balance = first(status?.mostRecentTrainingLoadBalance?.metricsTrainingLoadBalanceDTOMap);

    out.push("## État de forme actuel", "");
    out.push(`- VO2 max course : ${num(vo2, 1)}${vo2Bike ? `, vélo : ${num(vo2Bike, 1)}` : ""}`);
    out.push(`- Statut d'entraînement : ${ts?.trainingStatusFeedbackPhrase ?? "-"}`);
    if (load) {
      out.push(`- Charge aiguë (7 j) : ${num(load.dailyTrainingLoadAcute)}, chronique (28 j) : ${num(load.dailyTrainingLoadChronic)}, ratio : ${num(load.dailyAcuteChronicWorkloadRatio, 2)}`);
    }
    if (balance) {
      out.push(`- Charge mensuelle : aérobie basse ${num(balance.monthlyLoadAerobicLow)}, aérobie haute ${num(balance.monthlyLoadAerobicHigh)}, anaérobie ${num(balance.monthlyLoadAnaerobic)} (${balance.trainingBalanceFeedbackPhrase ?? "-"})`);
    }
    if (races) {
      out.push(`- Prédictions : 5 km ${dur(races.time5K)}, 10 km ${dur(races.time10K)}, semi ${dur(races.timeHalfMarathon)}, marathon ${dur(races.timeMarathon)}`);
    }
    out.push("");
    done++;
  }

  if (activities) {
    step("Activités");
    let list = [];
    for (let start = 0; ; start += 100) {
      const page = await safe("/activitylist-service/activities/search/activities", { start, limit: 100, startDate, endDate });
      if (!Array.isArray(page)) break;
      list.push(...page);
      if (page.length < 100) break;
      await pause(150);
    }
    if (SPORTS[sport]) list = list.filter((a) => SPORTS[sport].match.test(a.activityType?.typeKey ?? ""));
    list.sort((a, b) => (a.startTimeLocal < b.startTimeLocal ? -1 : 1));
    done++;

    out.push(`## Activités (${list.length})`, "");
    out.push("| Date | Type | Nom | Distance | Durée | Allure / vitesse | FC moy | FC max | D+ (m) | TE aéro | TE anaéro | Charge | Calories |");
    out.push("|---|---|---|---|---|---|---|---|---|---|---|---|---|");
    for (const a of list) {
      const type = a.activityType?.typeKey ?? "";
      out.push(`| ${cell(a.startTimeLocal?.slice(0, 16))} | ${cell(type)} | ${cell(a.activityName)} | ${a.distance ? num(a.distance / 1000, 2) : "-"} | ${dur(a.duration)} | ${speed(type, a.averageSpeed)} | ${num(a.averageHR)} | ${num(a.maxHR)} | ${num(a.elevationGain)} | ${num(a.aerobicTrainingEffect, 1)} | ${num(a.anaerobicTrainingEffect, 1)} | ${num(a.activityTrainingLoad)} | ${num(a.calories)} |`);
    }
    out.push("");

    if (details && list.length) {
      total += list.length;
      let detailDone = 0;
      step(`Détail des séances 0/${list.length}`);

      const sections = await inBatches(list, 3, async (a) => {
        const id = a.activityId;
        const type = a.activityType?.typeKey ?? "";
        const strength = /strength/.test(type);
        const [zones, splits, weather, sets] = await Promise.all([
          safe(`/activity-service/activity/${id}/hrTimeInZones`),
          strength ? null : safe(`/activity-service/activity/${id}/splits`),
          strength ? null : safe(`/activity-service/activity/${id}/weather`),
          strength ? safe(`/activity-service/activity/${id}/exerciseSets`) : null,
        ]);
        done++;
        detailDone++;
        step(`Détail des séances ${detailDone}/${list.length}`);

        const lines = [`### ${a.startTimeLocal?.slice(0, 16)} · ${cell(a.activityName)} (${type})`, ""];

        if (Array.isArray(zones) && zones.length) {
          const z = zones
            .filter((x) => x.secsInZone > 0)
            .map((x) => `Z${x.zoneNumber} ${dur(x.secsInZone)}${x.zoneLowBoundary ? ` (≥${x.zoneLowBoundary})` : ""}`);
          if (z.length) lines.push(`- Zones cardio : ${z.join(", ")}`);
        }

        const dyn = [
          a.averageRunningCadenceInStepsPerMinute && `cadence ${num(a.averageRunningCadenceInStepsPerMinute)} pas/min`,
          a.avgStrideLength && `foulée ${num(a.avgStrideLength / 100, 2)} m`,
          a.avgGroundContactTime && `contact au sol ${num(a.avgGroundContactTime)} ms`,
          a.avgVerticalOscillation && `oscillation ${num(a.avgVerticalOscillation, 1)} cm`,
          a.avgVerticalRatio && `ratio vertical ${num(a.avgVerticalRatio, 1)} %`,
          a.avgPower && `puissance ${num(a.avgPower)} W`,
        ].filter(Boolean);
        if (dyn.length) lines.push(`- Dynamique : ${dyn.join(", ")}`);

        if (weather && weather.temp != null) {
          const celsius = (weather.temp - 32) * (5 / 9); // Garmin donne la météo en °F
          const w = [`${num(celsius)} °C`];
          if (weather.relativeHumidity != null) w.push(`humidité ${num(weather.relativeHumidity)} %`);
          if (weather.windSpeed != null) w.push(`vent ${num(weather.windSpeed * 1.609)} km/h`);
          if (weather.weatherTypeDTO?.desc) w.push(weather.weatherTypeDTO.desc);
          lines.push(`- Météo : ${w.join(", ")}`);
        }

        const laps = splits?.lapDTOs;
        if (Array.isArray(laps) && laps.length > 1) {
          lines.push("", "| Tour | Distance | Durée | Allure / vitesse | FC moy | FC max | Cadence | D+ (m) |", "|---|---|---|---|---|---|---|---|");
          laps.forEach((l, i) => {
            lines.push(`| ${i + 1} | ${l.distance ? num(l.distance / 1000, 2) : "-"} | ${dur(l.duration)} | ${speed(type, l.averageSpeed)} | ${num(l.averageHR)} | ${num(l.maxHR)} | ${num(l.averageRunCadence)} | ${num(l.elevationGain)} |`);
          });
        }

        const active = (sets?.exerciseSets ?? []).filter((s) => s.setType === "ACTIVE");
        if (active.length) {
          lines.push("", "| Série | Exercice | Répétitions | Charge | Durée |", "|---|---|---|---|---|");
          active.forEach((s, i) => {
            const ex = s.exercises?.[0];
            const name = [ex?.category, ex?.name].filter((x) => x && x !== "UNKNOWN").join(" / ") || "-";
            // Garmin stocke la charge en grammes.
            const kg = s.weight > 0 ? `${num(s.weight > 500 ? s.weight / 1000 : s.weight, 1)} kg` : "-";
            lines.push(`| ${i + 1} | ${cell(name)} | ${num(s.repetitionCount)} | ${kg} | ${dur(s.duration)} |`);
          });
        }

        return lines.length > 2 ? lines.join("\n") : null;
      });

      const filled = sections.filter(Boolean);
      if (filled.length) out.push("## Détail des séances", "", filled.join("\n\n"), "");
    }
  }

  if (daily && displayName) {
    let dayDone = 0;
    step(`Journées 0/${days}`);
    const rows = await inBatches(dates, 4, async (date) => {
      const [summary, sleep, hrv, readiness] = await Promise.all([
        safe(`/usersummary-service/usersummary/daily/${displayName}`, { calendarDate: date }),
        safe(`/wellness-service/wellness/dailySleepData/${displayName}`, { date, nonSleepBufferMinutes: 60 }),
        safe(`/hrv-service/hrv/${date}`),
        safe(`/metrics-service/metrics/trainingreadiness/${date}`),
      ]);
      done++;
      dayDone++;
      step(`Journées ${dayDone}/${days}`);
      const s = sleep?.dailySleepDTO;
      const r = Array.isArray(readiness) ? readiness[0] : readiness;
      return {
        date,
        sleep: s?.sleepTimeSeconds,
        sleepScore: s?.sleepScores?.overall?.value,
        deep: s?.deepSleepSeconds,
        rem: s?.remSleepSeconds,
        hrv: hrv?.hrvSummary?.lastNightAvg,
        hrvStatus: hrv?.hrvSummary?.status,
        rhr: summary?.restingHeartRate,
        stress: summary?.averageStressLevel,
        bbMax: summary?.bodyBatteryHighestValue,
        bbMin: summary?.bodyBatteryLowestValue,
        readiness: r?.score,
        steps: summary?.totalSteps,
      };
    });

    const recent = rows.slice(-DETAILED_DAYS);
    const older = rows.slice(0, -DETAILED_DAYS);

    if (older.length) {
      // Regroupe par semaine (lundi), pour garder le fichier lisible sur plusieurs mois.
      const weeks = new Map();
      for (const d of older) {
        const dt = new Date(`${d.date}T12:00:00`);
        dt.setDate(dt.getDate() - ((dt.getDay() + 6) % 7));
        const key = iso(dt);
        if (!weeks.has(key)) weeks.set(key, []);
        weeks.get(key).push(d);
      }
      out.push("## Moyennes par semaine", "");
      out.push("| Semaine du | Sommeil | Score sommeil | HRV nuit (ms) | FC repos | Stress moy | Body Battery max | Readiness | Pas / jour |");
      out.push("|---|---|---|---|---|---|---|---|---|");
      for (const [week, ds] of weeks) {
        const m = (k) => avg(ds.map((d) => d[k]));
        out.push(`| ${week} | ${hm(m("sleep"))} | ${num(m("sleepScore"))} | ${num(m("hrv"))} | ${num(m("rhr"))} | ${num(m("stress"))} | ${num(m("bbMax"))} | ${num(m("readiness"))} | ${num(m("steps"))} |`);
      }
      out.push("");
    }

    out.push(older.length ? `## Journées (${recent.length} derniers jours)` : "## Journées", "");
    out.push("| Date | Sommeil | Score sommeil | Profond | REM | HRV nuit (ms) | Statut HRV | FC repos | Stress moy | Body Battery max / min | Readiness | Pas |");
    out.push("|---|---|---|---|---|---|---|---|---|---|---|---|");
    for (const d of recent) {
      out.push(`| ${d.date} | ${hm(d.sleep)} | ${num(d.sleepScore)} | ${hm(d.deep)} | ${hm(d.rem)} | ${num(d.hrv)} | ${cell(d.hrvStatus)} | ${num(d.rhr)} | ${num(d.stress)} | ${num(d.bbMax)} / ${num(d.bbMin)} | ${num(d.readiness)} | ${num(d.steps)} |`);
    }
    out.push("");
  }

  return { markdown: out.join("\n"), warnings };
}
