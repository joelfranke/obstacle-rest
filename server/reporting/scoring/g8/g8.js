/* global Chart */

const G8_LEADERBOARD_PATH = '/api/scoring/g8';

function getApiBase() {
  if (typeof window !== 'undefined' && window.G8_API_BASE) {
    return String(window.G8_API_BASE).replace(/\/$/, '');
  }
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get('apiBase') || params.get('api');
  if (fromQuery) return String(fromQuery).replace(/\/$/, '');
  return '';
}

function apiUrl(path) {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const base = getApiBase();
  return base ? `${base}${normalized}` : normalized;
}

function $(id) {
  return document.getElementById(id);
}

function textOrDash(v) {
  if (v === null || v === undefined) return '—';
  const s = String(v).trim();
  return s.length ? s : '—';
}

function safeNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function formatInt(n) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);
}

function formatScore(n) {
  // G8 scoring is typically effectively-integer; keep it stable for UI comparisons.
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(Math.round(n));
}

function fullName(p) {
  const f = textOrDash(p.firstName === undefined ? '' : p.firstName);
  const l = textOrDash(p.lastName === undefined ? '' : p.lastName);
  const name = `${f} ${l}`.trim();
  return name.length ? name : '—';
}

function genderLabel(g) {
  const s = String(g || '').toUpperCase();
  if (s.startsWith('M')) return 'M';
  if (s.startsWith('F')) return 'F';
  return textOrDash(g);
}

function keyFor(p) {
  // API aggregation groups on these fields; this keeps identity stable across refreshes.
  if (p && p.bibNo !== undefined && p.bibNo !== null) return `bib:${p.bibNo}`;
  return `${p.firstName}|${p.lastName}|${p.group}|${p.gender}`;
}

function getPollMs() {
  const params = new URLSearchParams(window.location.search);
  const v = params.get('interval');
  const n = v ? Number(v) : NaN;
  if (Number.isFinite(n) && n >= 3000) return n;
  return 15000;
}

let pollMs = getPollMs();
let prevByKey = new Map();
let activeGender = 'ALL'; // ALL | M | F

function setActiveTab(gender) {
  activeGender = gender;
  prevByKey = new Map(); // reset movement highlights after filter change

  $('btnAll').classList.toggle('active', gender === 'ALL');
  $('btnM').classList.toggle('active', gender === 'M');
  $('btnF').classList.toggle('active', gender === 'F');

  renderFromLatest();
}

function applyGenderFilter(list) {
  if (activeGender === 'ALL') return list;
  const want = activeGender;
  return list.filter((p) => {
    const gl = genderLabel(p.gender);
    return gl === want;
  });
}

function sortByScoreDesc(list) {
  return [...list].sort((a, b) => safeNumber(b.score) - safeNumber(a.score));
}

function getLeaderboardSlice(list) {
  // No toggle anymore: always show the full leaderboard for the current filter.
  return list;
}

function makeTr({ rank, p, trendClass }) {
  const tr = document.createElement('tr');
  if (trendClass) tr.classList.add(trendClass);
  if (p && p.bibNo !== undefined && p.bibNo !== null) tr.dataset.bibNo = String(p.bibNo);
  tr.addEventListener('click', () => openLapModal(p));

  const tdRank = document.createElement('td');
  tdRank.textContent = String(rank);
  tr.appendChild(tdRank);

  const tdName = document.createElement('td');
  tdName.innerHTML = `<div style="font-weight:900;">${fullName(p)}</div><div class="muted" style="font-size:12px; margin-top:2px;">${textOrDash(
    p.group
  )}</div>`;
  tr.appendChild(tdName);

  const tdGroup = document.createElement('td');
  tdGroup.textContent = textOrDash(p.group);
  tr.appendChild(tdGroup);

  const tdGender = document.createElement('td');
  tdGender.textContent = genderLabel(p.gender);
  tr.appendChild(tdGender);

  const tdG1 = document.createElement('td');
  tdG1.textContent = formatInt(safeNumber(p.g1));
  tr.appendChild(tdG1);

  const tdG2 = document.createElement('td');
  tdG2.textContent = formatInt(safeNumber(p.g2));
  tr.appendChild(tdG2);

  const tdG3 = document.createElement('td');
  tdG3.textContent = formatInt(safeNumber(p.g3));
  tr.appendChild(tdG3);

  const tdScore = document.createElement('td');
  tdScore.textContent = formatScore(safeNumber(p.score));
  tr.appendChild(tdScore);

  const tdObs = document.createElement('td');
  tdObs.textContent = formatInt(safeNumber(p.obstaclesCompleted));
  tr.appendChild(tdObs);

  const tdAvgLap = document.createElement('td');
  tdAvgLap.textContent = formatLapMinutes(p.avgLapMs);
  tr.appendChild(tdAvgLap);

  return tr;
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function parseDeviceTimeToMs(timeStr) {
  if (timeStr === undefined || timeStr === null) return NaN;
  const s = String(timeStr).trim();
  if (!s.length) return NaN;

  const m = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (!m) return NaN;

  let hours = Number(m[1]);
  const minutes = Number(m[2]);
  const seconds = m[3] !== undefined ? Number(m[3]) : 0;
  const ampm = String(m[4]).toUpperCase();

  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || !Number.isFinite(seconds)) return NaN;
  if (ampm === 'PM' && hours !== 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;

  return (hours * 3600 + minutes * 60 + seconds) * 1000;
}

function deviceTimeToEpochMs(deviceTime, refTimestampMs) {
  const msFromMidnight = parseDeviceTimeToMs(deviceTime);
  if (!Number.isFinite(msFromMidnight) || !Number.isFinite(refTimestampMs)) return NaN;
  const ref = new Date(refTimestampMs);
  const dayStart = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate()).getTime();
  return dayStart + msFromMidnight;
}

function participantStartMs(participant, events) {
  const deviceTime = participant?.startTime?.deviceTime;
  if (!deviceTime || !events.length) return NaN;
  const refTs = new Date(events[0].timestamp).getTime();
  return deviceTimeToEpochMs(deviceTime, refTs);
}

function participantFinishMs(participant, events) {
  const deviceTime = participant?.finishTime?.deviceTime;
  if (!deviceTime || !events.length) return NaN;
  let refTs = NaN;
  for (const ev of events) {
    const t = new Date(ev.timestamp).getTime();
    if (!Number.isFinite(t)) continue;
    refTs = Number.isFinite(refTs) ? Math.max(refTs, t) : t;
  }
  if (!Number.isFinite(refTs)) return NaN;
  return deviceTimeToEpochMs(deviceTime, refTs);
}

function formatDurationMs(ms) {
  if (!Number.isFinite(ms)) return '—';
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${pad2(m)}:${pad2(s)}`;
  return `${m}:${pad2(s)}`;
}

/** Leaderboard lap column: always total minutes (never H:MM:SS). */
function formatLapMinutes(ms) {
  if (!Number.isFinite(ms)) return '—';
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${pad2(s)}`;
}

function lapStatsFromEvents(events) {
  const lapStartMs = new Map();
  const lapEndMs = new Map();
  const lapEventCount = new Map();
  for (const ev of events) {
    const lap = Number(ev.lapCount || 0);
    if (!Number.isFinite(lap) || lap <= 0) continue;
    const t = new Date(ev.timestamp).getTime();
    if (!Number.isFinite(t)) continue;
    lapEventCount.set(lap, (lapEventCount.get(lap) || 0) + 1);
    if (!lapStartMs.has(lap)) {
      lapStartMs.set(lap, t);
      lapEndMs.set(lap, t);
    } else {
      lapStartMs.set(lap, Math.min(lapStartMs.get(lap), t));
      lapEndMs.set(lap, Math.max(lapEndMs.get(lap), t));
    }
  }
  return { lapStartMs, lapEndMs, lapEventCount };
}

/**
 * Lap timing (matches test-g8-user.js):
 * - lap start = earliest obstacle scan on lap L (lap 1 uses start-line time when only one scan so far)
 * - lap finish (complete) = earliest scan on lap L+1
 * - lap finish (final lap, course done) = participant finishTime when set
 * - lap finish (in progress) = latest scan on lap L
 */
function buildLapDurations(events, participant) {
  const { lapStartMs, lapEndMs, lapEventCount } = lapStatsFromEvents(events);
  if (!lapStartMs.size) return [];

  const startLineMs = participantStartMs(participant, events);
  const finishLineMs = participantFinishMs(participant, events);
  const laps = [...lapStartMs.keys()].sort((a, b) => a - b);
  const lastLap = laps[laps.length - 1];
  const rows = [];

  for (const lap of laps) {
    const firstEventMs = lapStartMs.get(lap);
    const lastEventMs = lapEndMs.get(lap);
    const nextLapStartMs = lapStartMs.get(lap + 1);
    const eventCount = lapEventCount.get(lap) || 0;

    let startMs = firstEventMs;
    if (lap === 1 && eventCount <= 1 && Number.isFinite(startLineMs)) {
      startMs = startLineMs;
    }

    let endMs;
    let complete;
    if (nextLapStartMs !== undefined) {
      endMs = nextLapStartMs;
      complete = true;
    } else if (lap === lastLap && Number.isFinite(finishLineMs)) {
      endMs = finishLineMs;
      complete = true;
    } else {
      endMs = lastEventMs;
      complete = false;
    }

    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) continue;

    rows.push({
      lap,
      durationMs: endMs - startMs,
      complete,
      startMs,
      endMs,
    });
  }

  return rows;
}

function computeAvgLapMs(events, participant) {
  const rows = buildLapDurations(events, participant);
  if (!rows.length) return NaN;

  const completed = rows.filter((row) => row.complete);
  const pool = completed.length ? completed : [rows[rows.length - 1]];
  const avgMs = pool.reduce((sum, row) => sum + row.durationMs, 0) / pool.length;
  return avgMs;
}

async function resolveAvgLapMs(bibNo, obstaclesCompleted) {
  if (!(obstaclesCompleted > 0)) return NaN;

  try {
    const [resultsResp, participantResp] = await Promise.all([
      fetch(apiUrl(`/scoring/results/${bibNo}/all`), { method: 'GET', cache: 'no-store' }),
      fetch(apiUrl(`/participant?bibNo=${bibNo}`), { method: 'GET', cache: 'no-store' }),
    ]);
    if (!resultsResp.ok) return NaN;

    const resultsData = await resultsResp.json();
    const events = resultsData?.participantResults || [];
    let participant = null;
    if (participantResp.ok) {
      const participantData = await participantResp.json();
      participant = participantData?.participants?.[0] || null;
    }
    return computeAvgLapMs(events, participant);
  } catch (e) {
    return NaN;
  }
}

function formatTimeMs(ms) {
  if (!Number.isFinite(ms)) return '—';
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' });
}

/** Tier shown as a chip class for G1 / G2 / G3 (scoring emphasis). */
function tierChipHtml(tier) {
  const n = Number(tier);
  if (!Number.isFinite(n) || n <= 0) {
    return '<span class="chip tier-unknown" title="No tier">—</span>';
  }
  const g = Math.trunc(n);
  let cls = 'tier-unknown';
  if (g === 1) cls = 'tier-g1';
  else if (g === 2) cls = 'tier-g2';
  else if (g === 3) cls = 'tier-g3';
  const pts = g === 1 ? '1 pt' : g === 2 ? '3 pts' : g === 3 ? '5 pts' : '';
  const title = pts ? `Tier ${g} (${pts})` : `Tier ${g}`;
  return `<span class="chip ${cls}" title="${title}">G${g}</span>`;
}

function getStatusChipClass(status) {
  if (status === 'Complete') return 'chip ok';
  if (status === 'In progress') return 'chip warn';
  return 'chip';
}

function closeLapModal() {
  const modal = $('lapModal');
  if (modal) modal.hidden = true;
}

async function openLapModal(p) {
  if (!p || p.bibNo === undefined || p.bibNo === null) return;

  const bibNo = p.bibNo;
  const modal = $('lapModal');
  const lapTableBody = $('lapTable').querySelector('tbody');
  const lapResultBody = $('lapResultTable').querySelector('tbody');
  modal.hidden = false;

  $('lapModalParticipant').textContent = `${fullName(p)} (Bib#${bibNo})`;
  $('lapModalOverall').textContent = '';
  $('lapStatus').textContent = 'Loading…';
  lapTableBody.innerHTML = '';
  lapResultBody.innerHTML = '';
  $('lapResultTitle').textContent = 'Lap results';
  $('lapResultHint').textContent = 'Select a lap to view obstacle-by-obstacle results.';

  try {
    // Fetch start/finish (strings) + per-lap timestamps (ISO dates) from existing APIs.
    const [participantResp, resultsResp, obstacleResp] = await Promise.all([
      fetch(apiUrl(`/participant?bibNo=${bibNo}`)),
      fetch(apiUrl(`/scoring/results/${bibNo}/all`)),
      fetch(apiUrl('/obstacle-details'))
    ]);

    const participantData = await participantResp.json();
    const participant = participantData?.participants?.[0] || null;

    const resultsData = await resultsResp.json();
    const events = resultsData?.participantResults || [];
    const obstacleData = await obstacleResp.json();
    const obstacleList = Array.isArray(obstacleData?.obstacle) ? obstacleData.obstacle : [];
    const obstacleNameBySeq = new Map();
    for (const ob of obstacleList) {
      const seq = Number(ob.sequence);
      if (!Number.isFinite(seq) || seq <= 0) continue;
      obstacleNameBySeq.set(seq, textOrDash(ob.name));
    }

    const lapEvents = new Map(); // lap -> array of events
    for (const ev of events) {
      const lap = Number(ev.lapCount || 0);
      const t = new Date(ev.timestamp).getTime();
      if (!Number.isFinite(lap) || !Number.isFinite(t)) continue;
      if (!lapEvents.has(lap)) lapEvents.set(lap, []);
      lapEvents.get(lap).push(ev);
    }

    const lapRows = buildLapDurations(events, participant);
    const lapKeys = lapRows.map((row) => row.lap);
    const highestLapSeen = lapKeys.length ? lapKeys[lapKeys.length - 1] : 0;
    const participantLapCount = participant && Number.isFinite(Number(participant.lapCount)) ? Number(participant.lapCount) : 0;
    const maxLap = Math.max(highestLapSeen, participantLapCount);
    const lapRowByLap = new Map(lapRows.map((row) => [row.lap, row]));

    const startDeviceTime = participant?.startTime?.deviceTime || null;
    const finishDeviceTime = participant?.finishTime?.deviceTime || null;
    $('lapModalOverall').textContent = `Start: ${startDeviceTime || '—'} · Latest finish: ${finishDeviceTime || '—'} · Current lap: ${
      participant?.lapCount !== undefined && participant?.lapCount !== null ? participant.lapCount : '—'
    }`;

    $('lapStatus').textContent = lapKeys.length ? 'Ready' : 'No lap event data yet.';

    if (!maxLap) {
      // No laps yet, show an empty state row
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>—</td><td>—</td><td>—</td><td>—</td><td class="muted">—</td>
      `;
      lapTableBody.appendChild(tr);
      return;
    }

    const selectLap = (lap) => {
      const rows = lapTableBody.querySelectorAll('tr');
      for (const r of rows) r.classList.remove('selected');
      const active = lapTableBody.querySelector(`tr[data-lap="${lap}"]`);
      if (active) active.classList.add('selected');

      const lapEventsRaw = lapEvents.get(lap) || [];
      const lapEventsSorted = [...lapEventsRaw].sort((a, b) => {
        const seqA = safeNumber(a.obstID);
        const seqB = safeNumber(b.obstID);
        if (seqA !== seqB) return seqA - seqB;
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      });

      const bestByObstacle = new Map();
      for (const ev of lapEventsSorted) {
        const seq = safeNumber(ev.obstID);
        if (!Number.isFinite(seq) || seq <= 0) continue;
        const prev = bestByObstacle.get(seq);
        if (!prev) {
          bestByObstacle.set(seq, ev);
          continue;
        }
        const prevPoints = safeNumber(prev.points);
        const nowPoints = safeNumber(ev.points);
        if (nowPoints > prevPoints) {
          bestByObstacle.set(seq, ev);
        }
      }

      const obstaclesForLap = [...bestByObstacle.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([seq, ev]) => ({ seq, ev }));

      $('lapResultTitle').textContent = `Lap ${lap} results`;

      let g1 = 0;
      let g2 = 0;
      let g3 = 0;
      for (const row of obstaclesForLap) {
        const t = Math.trunc(Number(row.ev?.tier));
        if (t === 1) g1++;
        else if (t === 2) g2++;
        else if (t === 3) g3++;
      }
      const nObs = obstaclesForLap.length;
      $('lapResultHint').textContent =
        nObs === 0
          ? 'No obstacle scans for this lap yet.'
          : `${nObs} obstacle${nObs === 1 ? '' : 's'} · G3: ${g3} · G2: ${g2} · G1: ${g1}`;

      lapResultBody.innerHTML = '';

      if (!obstaclesForLap.length) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="5" class="muted lapResultsEmpty">No events for this lap yet.</td>`;
        lapResultBody.appendChild(tr);
        return;
      }

      for (const row of obstaclesForLap) {
        const ev = row.ev;
        const success = ev?.success === true;
        const timeMs = new Date(ev.timestamp).getTime();
        const name = obstacleNameBySeq.get(row.seq) || `Obstacle ${row.seq}`;

        const tr = document.createElement('tr');
        const tdNum = document.createElement('td');
        tdNum.className = 'lapResultsNum';
        tdNum.textContent = String(row.seq);

        const tdName = document.createElement('td');
        tdName.className = 'lapObstName';
        tdName.textContent = name;
        tdName.title = name;

        const tdTier = document.createElement('td');
        tdTier.className = 'lapResultsTier';
        tdTier.innerHTML = tierChipHtml(ev?.tier);

        const tdRes = document.createElement('td');
        tdRes.className = 'lapResultsResult';
        tdRes.innerHTML = `<span class="chip ${success ? 'ok' : 'danger'}">${success ? 'Pass' : 'Fail'}</span>`;

        const tdTime = document.createElement('td');
        tdTime.className = 'lapResultsTime';
        tdTime.textContent = formatTimeMs(timeMs);

        tr.appendChild(tdNum);
        tr.appendChild(tdName);
        tr.appendChild(tdTier);
        tr.appendChild(tdRes);
        tr.appendChild(tdTime);
        lapResultBody.appendChild(tr);
      }
    };

    for (let lap = 1; lap <= maxLap; lap++) {
      const row = lapRowByLap.get(lap);

      const tr = document.createElement('tr');
      tr.dataset.lap = String(lap);
      tr.addEventListener('click', () => selectLap(lap));
      if (!row) {
        tr.innerHTML = `<td>${lap}</td><td>—</td><td>—</td><td>—</td><td class="muted">—</td>`;
      } else {
        const status = row.complete ? 'Complete' : 'In progress';
        tr.innerHTML = `
          <td>${lap}</td>
          <td>${formatTimeMs(row.startMs)}</td>
          <td>${formatTimeMs(row.endMs)}</td>
          <td>${formatDurationMs(row.durationMs)}</td>
          <td><span class="${getStatusChipClass(status)}">${status}</span></td>
        `;
      }
      lapTableBody.appendChild(tr);
    }

    selectLap(1);
  } catch (e) {
    $('lapStatus').textContent = `Error: ${e && e.message ? e.message : 'unknown'}`;
  } finally {
    // keep modal visible
  }
}

function renderPodium(participantsSorted) {
  const host = $('podium');
  host.innerHTML = '';

  const top3 = participantsSorted.slice(0, 3);
  const spots = [
    { place: 1, placeClass: 'one', label: '1st' },
    { place: 2, placeClass: 'two', label: '2nd' },
    { place: 3, placeClass: 'three', label: '3rd' }
  ];

  for (const spot of spots) {
    const p = top3[spot.place - 1];
    const el = document.createElement('div');
    el.className = `podiumSpot`;

    if (!p) {
      el.innerHTML = `
        <div class="place ${spot.placeClass}">#${spot.place}</div>
        <div class="spotName">Waiting…</div>
        <div class="spotScore muted">—</div>
      `;
    } else {
      el.innerHTML = `
        <div class="spotTop">
          <div class="place ${spot.placeClass}">#${spot.place}</div>
          <div class="spotScore">${genderLabel(p.gender)}</div>
        </div>
        <div class="spotName">${fullName(p)}</div>
        <div class="spotScore muted">${textOrDash(p.group)} · Score: ${formatScore(safeNumber(p.score))}</div>
      `;
    }
    host.appendChild(el);
  }
}

let latestParticipants = [];

function renderFromLatest() {
  const raw = latestParticipants || [];
  const filtered = applyGenderFilter(raw);
  const sorted = sortByScoreDesc(filtered);
  const sliced = getLeaderboardSlice(sorted);

  $('emptyState').hidden = sorted.length !== 0;
  $('rowCount').textContent = `Showing ${sliced.length} of ${sorted.length}`;

  renderPodium(sortByScoreDesc(raw));

  const tbody = $('leaderboard').querySelector('tbody');
  tbody.innerHTML = '';

  for (const tr of sliced.map((p, idx) => {
    const rank = idx + 1;
    const key = keyFor(p);
    const prev = prevByKey.get(key);
    let trendClass = '';

    if (prev) {
      if (rank < prev.rank) trendClass = 'moved-up';
      if (rank > prev.rank) trendClass = 'moved-down';
      const scoreChanged = safeNumber(p.score) !== safeNumber(prev.score);
      if (scoreChanged) {
        // subtle emphasis on score changes
        if (safeNumber(p.score) > safeNumber(prev.score)) trendClass = trendClass || 'score-up';
      }
    }
    return { rank, p, trendClass };
  }).map((row) => makeTr(row))) {
    tbody.appendChild(tr);
  }

  // Update movement snapshot AFTER rendering so it compares against the previous poll.
  prevByKey = new Map();
  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i];
    prevByKey.set(keyFor(p), { rank: i + 1, score: safeNumber(p.score) });
  }
}

async function fetchOnce() {
  const statusEl = $('status');
  statusEl.textContent = 'Loading…';

  const startedAt = Date.now();
  const resp = await fetch(apiUrl(G8_LEADERBOARD_PATH), { method: 'GET', cache: 'no-store' });
  if (!resp.ok) {
    throw new Error(`API error: ${resp.status}`);
  }
  const data = await resp.json();
  const list = (data && data.participantScores) ? data.participantScores : [];

  // Enrich with per-participant average lap time (ms).
  latestParticipants = await Promise.all(list.map(async (p) => {
    const bibNo = safeNumber(p.bibNo);
    const obstaclesCompleted = safeNumber(p.obstaclesCompleted);
    const avgLapMs = await resolveAvgLapMs(bibNo, obstaclesCompleted);

    return {
      bibNo,
      firstName: p.firstName,
      lastName: p.lastName,
      group: p.group,
      gender: p.gender,
      g1: safeNumber(p.g1),
      g2: safeNumber(p.g2),
      g3: safeNumber(p.g3),
      score: safeNumber(p.score),
      obstaclesCompleted,
      avgLapMs,
    };
  }));

  const last = new Date();
  $('lastUpdated').textContent = last.toLocaleTimeString();
  statusEl.textContent = `OK (${Date.now() - startedAt}ms)`;

  renderFromLatest();
}

async function tick() {
  try {
    await fetchOnce();
  } catch (e) {
    $('status').textContent = `Error: ${e && e.message ? e.message : 'unknown'}`;
    latestParticipants = [];
    renderFromLatest();
  }

  window.setTimeout(tick, pollMs);
}

function wireUi() {
  $('pollInterval').textContent = String(pollMs / 1000);

  const apiBase = getApiBase();
  const footerEl = document.querySelector('.footerInner');
  if (footerEl) {
    const target = apiBase || 'same origin';
    footerEl.innerHTML = `G8 real-time dashboard polling <code>${apiUrl(G8_LEADERBOARD_PATH)}</code> (${target}).`;
  }

  $('btnAll').addEventListener('click', () => setActiveTab('ALL'));
  $('btnM').addEventListener('click', () => setActiveTab('M'));
  $('btnF').addEventListener('click', () => setActiveTab('F'));

  $('btnRefresh').addEventListener('click', () => {
    fetchOnce().catch((e) => {
      $('status').textContent = `Error: ${e && e.message ? e.message : 'unknown'}`;
    });
  });

  // Lap modal wiring.
  $('btnCloseLap').addEventListener('click', closeLapModal);
  $('lapModalBackdrop').addEventListener('click', closeLapModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLapModal();
  });
}

wireUi();
tick();

