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
// régulièrement. options.lang ("en" ou "fr") choisit la langue des messages et du fichier.
// Renvoie { markdown, warnings } ou lève une erreur lisible.
async function runCollection(options, onProgress) {
  const lang = EXPORT_TEXT[options.lang] ? options.lang : DEFAULT_LANG;
  const tab = await getGarminTab();
  if (!tab.url?.startsWith("https://connect.garmin.com/")) {
    throw new Error(t("errNotLoggedIn", null, lang));
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
      args: [{ ...options, L: EXPORT_TEXT[lang] }],
    });
    if (!result) throw new Error(t("errNothing", null, lang));
    if (result.error) throw new Error(result.error);
    return result;
  } finally {
    clearInterval(timer);
  }
}

// Exécutée DANS la page connect.garmin.com : doit être autonome (aucune variable externe).
// options : days, sport ("all", "running", "strength", ...), details, activities, daily, fitness, stress, cycle,
// et L, les textes du fichier dans la langue choisie (EXPORT_TEXT de i18n.js).
async function collectGarminData({ days, sport = "all", details = false, activities = true, daily = true, fitness = true, stress = true, cycle = false, L }) {
  const f = (text, vars) => text.replace(/\{(\w+)\}/g, (_, k) => vars?.[k] ?? "");
  const csrf = document.querySelector('meta[name="csrf-token"]')?.content;
  if (!csrf) return { error: L.errSession };

  const CONTEXT_DAYS = 28; // journal Lifestyle et cycle : seulement les 28 derniers jours, pour limiter les appels
  const RAW_STRESS_DAYS = 90; // mesures de stress toutes les 3 min : seulement les 90 derniers jours (taille du fichier)
  const SPORTS = {
    running: /running/,
    strength: /strength/,
    cycling: /cycling|biking/,
    swimming: /swim/,
    walking: /walking|hiking/,
  };

  // Avancement lu par l'extension (voir runCollection). total grandit quand on connaît le nombre de séances.
  let total = 1 + (fitness ? 1 : 0) + (activities ? 1 : 0) + (daily ? days : 0);
  let done = 0;
  const step = (label) => {
    window.__garminForClaudeProgress = { done, total, label };
  };
  step(L.progProfile);

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
  // Heure locale d'un horodatage Garmin "Local" (déjà décalé : on le lit en UTC), en minutes depuis minuit.
  const minutesOfDay = (ts) => (ts ? new Date(ts).getUTCHours() * 60 + new Date(ts).getUTCMinutes() : null);
  const clock = (m) => {
    if (m == null) return "-";
    const r = Math.round(m) % (24 * 60);
    return `${String(Math.floor(r / 60)).padStart(2, "0")}:${String(r % 60).padStart(2, "0")}`;
  };
  // Résumé lisible d'une réponse Garmin au format inconnu ou variable : champs simples seulement, sans identifiants.
  const flatten = (obj, max = 300) => {
    const parts = [];
    const walk = (o, key) => {
      if (o == null || o === "" || o === false || parts.length > 30) return;
      if (Array.isArray(o)) return o.slice(0, 10).forEach((x) => walk(x, key));
      if (typeof o === "object") {
        for (const [k, v] of Object.entries(o)) {
          if (!/(^id$|Id$|uuid|^pk|timestamp|Timestamp|GMT|userProfile|^date$|calendarDate)/i.test(k)) walk(v, k);
        }
        return;
      }
      parts.push(`${key}: ${o}`);
    };
    walk(obj, "");
    const text = parts.join(", ");
    return text.length > max ? `${text.slice(0, max)}...` : text;
  };
  // Mesures brutes de stress de Garmin (toutes les 3 min), heure locale. Format compact sans calcul : une ligne
  // par heure, l'heure de la première mesure puis les valeurs dans l'ordre. Une nouvelle ligne commence aussi
  // quand Garmin a sauté une mesure, pour ne décaler aucune valeur. -1 et -2 sont les codes Garmin, laissés tels quels.
  const rawStress = (day) => {
    const values = day?.stressValuesArray;
    if (!Array.isArray(values) || !values.length) return null;
    let offset = -new Date().getTimezoneOffset() * 60000;
    if (day.startTimestampLocal && day.startTimestampGMT) {
      const local = Date.parse(`${day.startTimestampLocal}Z`);
      const gmt = Date.parse(`${day.startTimestampGMT}Z`);
      if (!Number.isNaN(local - gmt)) offset = local - gmt;
    }
    const lines = [];
    let line = null;
    let prevTs = null;
    for (const [ts, v] of values) {
      const t = new Date(ts + offset);
      const newHour = !line || t.getUTCHours() !== line.hour;
      const gap = prevTs != null && ts - prevTs !== 3 * 60000;
      if (newHour || gap) {
        line = { hour: t.getUTCHours(), text: `${String(t.getUTCHours()).padStart(2, "0")}:${String(t.getUTCMinutes()).padStart(2, "0")}` };
        lines.push(line);
      }
      line.text += ` ${v}`;
      prevTs = ts;
    }
    return lines.map((l) => l.text);
  };

  let profile;
  try {
    profile = await api("/userprofile-service/socialProfile");
  } catch (e) {
    return { error: f(L.errAccess, { e: e.message }) };
  }
  const displayName = profile?.displayName;
  done++;

  const sportLabel = SPORTS[sport] && L.sports[sport];
  const out = [
    f(L.title, { start: startDate, end: endDate, sport: sportLabel ? ` (${sportLabel})` : "" }),
    "",
    f(L.intro, { date: iso(today) }),
    "",
  ];

  if (fitness) {
    step(L.progFitness);
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

    out.push(L.fitnessTitle, "");
    out.push(f(L.vo2, { run: num(vo2, 1), bike: vo2Bike ? f(L.vo2Bike, { v: num(vo2Bike, 1) }) : "" }));
    out.push(f(L.trainingStatus, { v: ts?.trainingStatusFeedbackPhrase ?? "-" }));
    if (load) {
      out.push(f(L.load, { acute: num(load.dailyTrainingLoadAcute), chronic: num(load.dailyTrainingLoadChronic), ratio: num(load.dailyAcuteChronicWorkloadRatio, 2) }));
    }
    if (balance) {
      out.push(f(L.balance, {
        low: num(balance.monthlyLoadAerobicLow),
        high: num(balance.monthlyLoadAerobicHigh),
        anaerobic: num(balance.monthlyLoadAnaerobic),
        feedback: balance.trainingBalanceFeedbackPhrase ?? "-",
      }));
    }
    if (races) {
      out.push(f(L.races, { k5: dur(races.time5K), k10: dur(races.time10K), half: dur(races.timeHalfMarathon), full: dur(races.timeMarathon) }));
    }
    out.push("");
    done++;
  }

  if (activities) {
    step(L.progActivities);
    let list = [];
    for (let start = 0; ; start += 100) {
      const page = await safe("/activitylist-service/activities/search/activities", { start, limit: 100, startDate, endDate });
      if (!Array.isArray(page)) break;
      list.push(...page);
      if (page.length < 100) break;
      await pause(150);
    }
    if (SPORTS[sport]) list = list.filter((a) => SPORTS[sport].test(a.activityType?.typeKey ?? ""));
    list.sort((a, b) => (a.startTimeLocal < b.startTimeLocal ? -1 : 1));
    done++;

    out.push(f(L.activitiesTitle, { n: list.length }), "");
    out.push(L.activitiesHeader);
    out.push("|---|---|---|---|---|---|---|---|---|---|---|---|---|");
    for (const a of list) {
      const type = a.activityType?.typeKey ?? "";
      out.push(`| ${cell(a.startTimeLocal?.slice(0, 16))} | ${cell(type)} | ${cell(a.activityName)} | ${a.distance ? num(a.distance / 1000, 2) : "-"} | ${dur(a.duration)} | ${speed(type, a.averageSpeed)} | ${num(a.averageHR)} | ${num(a.maxHR)} | ${num(a.elevationGain)} | ${num(a.aerobicTrainingEffect, 1)} | ${num(a.anaerobicTrainingEffect, 1)} | ${num(a.activityTrainingLoad)} | ${num(a.calories)} |`);
    }
    out.push("");

    if (details && list.length) {
      total += list.length;
      let detailDone = 0;
      step(f(L.progDetails, { i: 0, n: list.length }));

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
        step(f(L.progDetails, { i: detailDone, n: list.length }));

        const lines = [`### ${a.startTimeLocal?.slice(0, 16)} · ${cell(a.activityName)} (${type})`, ""];

        if (Array.isArray(zones) && zones.length) {
          const z = zones
            .filter((x) => x.secsInZone > 0)
            .map((x) => `Z${x.zoneNumber} ${dur(x.secsInZone)}${x.zoneLowBoundary ? ` (≥${x.zoneLowBoundary})` : ""}`);
          if (z.length) lines.push(f(L.zones, { v: z.join(", ") }));
        }

        const dyn = [
          a.averageRunningCadenceInStepsPerMinute && f(L.cadence, { v: num(a.averageRunningCadenceInStepsPerMinute) }),
          a.avgStrideLength && f(L.stride, { v: num(a.avgStrideLength / 100, 2) }),
          a.avgGroundContactTime && f(L.groundContact, { v: num(a.avgGroundContactTime) }),
          a.avgVerticalOscillation && f(L.oscillation, { v: num(a.avgVerticalOscillation, 1) }),
          a.avgVerticalRatio && f(L.verticalRatio, { v: num(a.avgVerticalRatio, 1) }),
          a.avgPower && f(L.power, { v: num(a.avgPower) }),
        ].filter(Boolean);
        if (dyn.length) lines.push(f(L.dynamics, { v: dyn.join(", ") }));

        if (weather && weather.temp != null) {
          const celsius = (weather.temp - 32) * (5 / 9); // Garmin donne la météo en °F
          const w = [`${num(celsius)} °C`];
          if (weather.relativeHumidity != null) w.push(f(L.humidity, { v: num(weather.relativeHumidity) }));
          if (weather.windSpeed != null) w.push(f(L.wind, { v: num(weather.windSpeed * 1.609) }));
          if (weather.weatherTypeDTO?.desc) w.push(weather.weatherTypeDTO.desc);
          lines.push(f(L.weather, { v: w.join(", ") }));
        }

        const laps = splits?.lapDTOs;
        if (Array.isArray(laps) && laps.length > 1) {
          lines.push("", L.lapsHeader, "|---|---|---|---|---|---|---|---|");
          laps.forEach((l, i) => {
            lines.push(`| ${i + 1} | ${l.distance ? num(l.distance / 1000, 2) : "-"} | ${dur(l.duration)} | ${speed(type, l.averageSpeed)} | ${num(l.averageHR)} | ${num(l.maxHR)} | ${num(l.averageRunCadence)} | ${num(l.elevationGain)} |`);
          });
        }

        const active = (sets?.exerciseSets ?? []).filter((s) => s.setType === "ACTIVE");
        if (active.length) {
          lines.push("", L.setsHeader, "|---|---|---|---|---|");
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
      if (filled.length) out.push(L.detailsTitle, "", filled.join("\n\n"), "");
    }
  }

  if (daily && displayName) {
    let dayDone = 0;
    step(f(L.progDays, { i: 0, n: days }));
    const contextDates = new Set(dates.slice(-CONTEXT_DAYS));
    const rawStressDates = new Set(stress ? dates.slice(-RAW_STRESS_DAYS) : []);
    const rows = await inBatches(dates, 4, async (date) => {
      const detailed = contextDates.has(date);
      const [summary, sleep, hrv, readiness, stressDay, lifestyle, cycleDay] = await Promise.all([
        safe(`/usersummary-service/usersummary/daily/${displayName}`, { calendarDate: date }),
        safe(`/wellness-service/wellness/dailySleepData/${displayName}`, { date, nonSleepBufferMinutes: 60 }),
        safe(`/hrv-service/hrv/${date}`),
        safe(`/metrics-service/metrics/trainingreadiness/${date}`),
        rawStressDates.has(date) ? safe(`/wellness-service/wellness/dailyStress/${date}`) : null,
        // Journal « Lifestyle » de l'app Garmin : absent si jamais utilisé, on ne compte pas d'erreur.
        stress && detailed ? api(`/lifestylelogging-service/dailyLog/${date}`).catch(() => null) : null,
        cycle && detailed ? api(`/periodichealth-service/menstrualcycle/dayview/${date}`).catch(() => null) : null,
      ]);
      done++;
      dayDone++;
      step(f(L.progDays, { i: dayDone, n: days }));
      const s = sleep?.dailySleepDTO;
      const r = Array.isArray(readiness) ? readiness[0] : readiness;
      return {
        date,
        bed: minutesOfDay(s?.sleepStartTimestampLocal),
        wake: minutesOfDay(s?.sleepEndTimestampLocal),
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
        stressMax: summary?.maxStressLevel,
        stressRest: summary?.restStressDuration,
        stressLow: summary?.lowStressDuration,
        stressMedium: summary?.mediumStressDuration,
        stressHigh: summary?.highStressDuration,
        sleepStress: s?.avgSleepStress,
        raw: rawStress(stressDay),
        lifestyle: lifestyle ? flatten(lifestyle) : "",
        cycle: cycleDay ? flatten(cycleDay, 200) : "",
      };
    });

    out.push(L.daysTitle, "");
    out.push(L.daysHeader);
    out.push("|---|---|---|---|---|---|---|---|---|---|---|---|---|---|");
    for (const d of rows) {
      out.push(`| ${d.date} | ${clock(d.bed)} | ${clock(d.wake)} | ${hm(d.sleep)} | ${num(d.sleepScore)} | ${hm(d.deep)} | ${hm(d.rem)} | ${num(d.hrv)} | ${cell(d.hrvStatus)} | ${num(d.rhr)} | ${num(d.stress)} | ${num(d.bbMax)} / ${num(d.bbMin)} | ${num(d.readiness)} | ${num(d.steps)} |`);
    }
    out.push("");

    if (stress) {
      out.push(L.stressTitle, "");
      out.push(L.stressHeader);
      out.push("|---|---|---|---|---|---|---|---|");
      for (const d of rows) {
        out.push(`| ${d.date} | ${num(d.stress)} | ${num(d.stressMax)} | ${hm(d.stressRest)} | ${hm(d.stressLow)} | ${hm(d.stressMedium)} | ${hm(d.stressHigh)} | ${num(d.sleepStress)} |`);
      }
      out.push("");

      for (const d of rows.filter((r) => r.raw)) {
        out.push(f(L.rawStressTitle, { date: d.date }), "", ...d.raw, "");
      }

      const context = rows.filter((d) => d.lifestyle || d.cycle);
      if (context.length) {
        out.push(L.journalTitle, "");
        for (const d of context) {
          const bits = [d.lifestyle && f(L.journalLifestyle, { v: d.lifestyle }), d.cycle && f(L.journalCycle, { v: d.cycle })].filter(Boolean);
          out.push(f(L.journalLine, { date: d.date, v: bits.join(" ; ") }));
        }
        out.push("");
      }
    }
  }

  return { markdown: out.join("\n"), warnings };
}
