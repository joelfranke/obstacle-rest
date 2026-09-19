/* eslint-disable no-console */
/**
 * Create a test G8 participant and submit a multi-lap run of obstacle scans.
 *
 * This script writes directly to MongoDB (Participant, results, score) so it:
 * - avoids the API auth token requirement
 * - still produces the same data shape the G8 dashboard reads
 *
 * Run:
 *   node test-g8-user.js
 *
 * Optional:
 *   node test-g8-user.js --bibNo 12345
 *   node test-g8-user.js --firstName Test --lastName G8
 *   node test-g8-user.js --heat "9:00 AM"
 *   node test-g8-user.js --laps 7 --successRate 0.6
 */

process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const path = require('path');
const fs = require('fs');

// Ensure env defaults are applied (sets MONGODB_URI, PORT in development).
require('./src/config/config');

const { mongoose } = require('./src/db/mongoose');
require('./src/models/participant');
require('./src/models/eventresults');
require('./src/models/obstacles');
require('./src/models/scoring');
require('./src/models/counters');

const { Participant } = require('./src/models/participant');
const { eventResults: EventResults } = require('./src/models/eventresults');
const { obstacles: Obstacles } = require('./src/models/obstacles');
const { Scoring } = require('./src/models/scoring');
const { counters: Counters } = require('./src/models/counters');

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      out[key] = true;
    } else {
      out[key] = next;
      i++;
    }
  }
  return out;
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function formatTime12h(d) {
  const hours24 = d.getHours();
  const ampm = hours24 >= 12 ? 'PM' : 'AM';
  let hours12 = hours24 % 12;
  if (hours12 === 0) hours12 = 12;
  return `${hours12}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())} ${ampm}`;
}

function formatDurationMs(ms) {
  const n = Number(ms);
  if (!Number.isFinite(n)) return '—';
  const totalSec = Math.max(0, Math.floor(n / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m < 60) return `${m}m${pad2(s)}s`;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h}h${pad2(mm)}m${pad2(s)}s`;
}

function msToClock(ms) {
  const n = Number(ms);
  if (!Number.isFinite(n)) return '—';
  const d = new Date(n);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' });
}

function pointsFromTier(tier) {
  const t = Number(tier);
  if (t === 1) return 1;
  if (t === 2) return 3;
  if (t === 3) return 5;
  return 0;
}

function parseIntSafe(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

async function ensureCounterSeq(counterId) {
  const existing = await Counters.findOne({ _id: counterId }).exec();
  if (existing) return;
  await Counters.create({ _id: counterId, seq: 0 });
}

async function getNextResultID() {
  await ensureCounterSeq('results');
  const doc = await Counters.findOneAndUpdate(
    { _id: 'results' },
    { $inc: { seq: 1 } },
    { useFindAndModify: false } // older mongoose compatibility
  ).exec();
  // match existing legacy logic: returns the pre-increment value
  return doc.seq;
}

function tryLoadObstacleSequencesFromJson() {
  const jsonPath = path.join(__dirname, 'Obstacle Info (3).json');
  if (!fs.existsSync(jsonPath)) return [];
  const raw = fs.readFileSync(jsonPath, 'utf8');
  const parsed = JSON.parse(raw);
  const list = Array.isArray(parsed.obstacle) ? parsed.obstacle : [];
  return list
    .filter((o) => o && o.recordable === true && Number(o.sequence) > 0)
    .map((o) => Number(o.sequence))
    .sort((a, b) => a - b);
}

async function getObstacleSequences() {
  const dbObstacles = await Obstacles.find({ scored: true, sequence: { $ne: null } })
    .sort({ sequence: 1 })
    .lean()
    .exec();

  if (dbObstacles && dbObstacles.length > 0) {
    return dbObstacles.map((o) => Number(o.sequence)).filter((n) => Number.isFinite(n));
  }

  // Fallback for empty/never-seeded DB during local dev.
  const fromJson = tryLoadObstacleSequencesFromJson();
  if (fromJson.length === 0) {
    throw new Error(
      'No obstacles found in MongoDB (scored:true) and fallback JSON did not yield sequences.'
    );
  }
  return fromJson;
}

function randFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  const args = parseArgs(process.argv);

  const laps = parseIntSafe(args.laps) || 7;
  const successRate = args.successRate !== undefined ? Number(args.successRate) : 0.6;
  const g8SuccessTier = args.g8SuccessTier !== undefined ? Number(args.g8SuccessTier) : 3; // G3
  const g8FailureTier = args.g8FailureTier !== undefined ? Number(args.g8FailureTier) : 1; // G1 (arbitrary)

  const firstName = args.firstName
    ? String(args.firstName)
    : randFrom(['Avery', 'Jordan', 'Morgan', 'Riley', 'Taylor', 'Casey', 'Quinn', 'Skyler', 'Cameron', 'Parker']);
  const lastName = args.lastName
    ? String(args.lastName)
    : randFrom(['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Garcia', 'Wilson', 'Moore']);

  const gender = args.gender ? String(args.gender) : 'M';
  const group = args.group ? String(args.group) : 'g8-test';
  const heat = args.heat ? String(args.heat) : '9:00 AM';

  // Generate bib number unless provided.
  let bibNo = parseIntSafe(args.bibNo);
  if (bibNo === null) {
    // Use a random bib that is unlikely to conflict; still check for existence.
    for (let attempt = 0; attempt < 50; attempt++) {
      bibNo = Math.floor(100000 + Math.random() * 900000);
      const exists = await Participant.findOne({ bibNo }).lean().exec();
      if (!exists) break;
      bibNo = null;
    }
  }
  if (bibNo === null) throw new Error('Could not pick a free bibNo. Pass --bibNo explicitly.');

  console.log(`Using bibNo=${bibNo}`);
  console.log(`Generated name: ${firstName} ${lastName}`);
  console.log(
    `Params: laps=${laps}, successRate=${successRate}, tierOnSuccess=G${g8SuccessTier}, tierOnFailure=G${g8FailureTier}`
  );

  // Wait for mongoose connection from src/db/mongoose.
  await new Promise((resolve) => {
    if (mongoose.connection.readyState === 1) return resolve();
    mongoose.connection.once('connected', resolve);
  });

  const obstacleSequences = await getObstacleSequences();
  const obstacleCount = obstacleSequences.length;
  console.log(`Obstacles for test lap: ${obstacleCount}`);

  if (!Number.isFinite(successRate) || successRate < 0 || successRate > 1) {
    throw new Error(`Invalid --successRate. Expected 0..1, got: ${args.successRate}`);
  }

  // Clean out any old data for repeatability.
  await EventResults.deleteMany({ bibNo }).exec();
  await Scoring.deleteMany({ bibNo }).exec();
  await Participant.deleteMany({ bibNo }).exec();

  // Create the participant (registered + g8 enabled).
  const now = new Date();
  const lapStartBaseMs = now.getTime() + 10 * 1000;
  const scanIntervalMs = 15 * 1000; // obstacle spacing within a lap
  // In the G8 lap modal, lap duration is based on:
  // start = first timestamp with lapCount == L
  // finish = first timestamp with lapCount == L+1
  // Since we don't store start-line scans as eventResults rows, the natural approximation
  // is "next lap's first obstacle scan happens after N obstacle intervals", i.e. N * interval.
  // With 12 obstacles at 15s each, this yields 3:00 per lap (gap=0).
  const startGapMs = 0;
  const lapDurationMs = obstacleCount * scanIntervalMs + startGapMs;

  const lapStartMs = [];
  for (let lap = 1; lap <= laps; lap++) {
    lapStartMs.push(lapStartBaseMs + (lap - 1) * lapDurationMs);
  }

  // Participant-level timestamps (used for the "overall" end time).
  const participantStartMs = lapStartMs[0];
  const participantFinishMs = lapStartMs[laps - 1] + (obstacleCount - 1) * scanIntervalMs;

  const participant = await Participant.create({
    bibNo,
    g8: true,
    // In the real flow, lapCount increments only after each "start line" scan.
    // We start at 0 and update it lap-by-lap below to mimic that behavior.
    lapCount: 0,
    isDavid: true,
    waiver: true,
    heat,
    lastName,
    firstName,
    gender,
    group,
    teamID: args.teamID ? String(args.teamID) : null,
    birthdate: args.birthdate ? String(args.birthdate) : '1990-01-01',
    startTime: {
      deviceTime: formatTime12h(new Date(participantStartMs)),
      bibFromBand: true,
    },
    finishTime: {
      deviceTime: formatTime12h(
        new Date(participantFinishMs)
      ),
      bibFromBand: true,
    },
  });

  // Insert scan records for each obstacle in each lap.
  // G8 lap modal uses eventResults.timestamp + lapCount.
  const docs = [];

  const totalAttempts = laps * obstacleSequences.length;
  const targetSuccesses = Math.round(successRate * totalAttempts);
  if (targetSuccesses < obstacleSequences.length) {
    throw new Error(
      `Not enough successes to guarantee at least one successful attempt per obstacle. ` +
        `Computed targetSuccesses=${targetSuccesses}, obstacles=${obstacleSequences.length}. ` +
        `Increase laps or successRate.`
    );
  }

  // To guarantee a score > 60, we ensure every obstID has at least one successful tier attempt.
  // We do that by reserving lap=1 for all obstacles, then sprinkling remaining successes randomly.
  const reservedSuccesses = obstacleSequences.length; // all lap1 obstacles succeed
  const additionalSuccessesNeeded = targetSuccesses - reservedSuccesses; // can be 0+
  const remainingAttempts = []; // list of { lap, obstID, attemptIndex } (excluding lap1)
  for (let lap = 2; lap <= laps; lap++) {
    for (let i = 0; i < obstacleSequences.length; i++) {
      remainingAttempts.push({ lap, obstID: obstacleSequences[i] });
    }
  }
  // Shuffle remainingAttempts then take the first K as success.
  for (let i = remainingAttempts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = remainingAttempts[i];
    remainingAttempts[i] = remainingAttempts[j];
    remainingAttempts[j] = tmp;
  }

  const successSet = new Set(); // key: `${lap}|${obstID}`
  for (let i = 0; i < obstacleSequences.length; i++) {
    successSet.add(`1|${obstacleSequences[i]}`);
  }
  for (let i = 0; i < additionalSuccessesNeeded; i++) {
    const a = remainingAttempts[i];
    if (!a) break;
    successSet.add(`${a.lap}|${a.obstID}`);
  }

  let successCount = 0;
  let overallIndex = 0;

  // Simulate the very first "start line" scan for lap 1.
  await Participant.findOneAndUpdate(
    { bibNo },
    { $set: { lapCount: 1 } },
    { new: true }
  ).exec();
  console.log(`Simulated start line scan -> lapCount=1`);

  for (let lap = 1; lap <= laps; lap++) {
    const lapBase = lapStartMs[lap - 1];

    for (let i = 0; i < obstacleSequences.length; i++) {
      const obstID = obstacleSequences[i];
      const eventMs = lapBase + i * scanIntervalMs;
      const deviceTime = formatTime12h(new Date(eventMs));
      const timestamp = new Date(eventMs);
      const resultID = await getNextResultID();

      const isSuccess = successSet.has(`${lap}|${obstID}`);
      if (isSuccess) successCount++;

      const tier = isSuccess ? g8SuccessTier : g8FailureTier;
      const points = isSuccess ? pointsFromTier(tier) : 0;

      docs.push({
        bibNo,
        obstID,
        tier,
        success: isSuccess,
        bibFromBand: true,
        g8: true,
        timestamp,
        deviceTime,
        resultID,
        points,
        countScore: true,
        lapCount: lap,
      });
      overallIndex++;
    }

    // Simulate the next lap's "start line scan" at the lap boundary
    // (i.e., after the 12 obstacles for the current lap).
    if (lap < laps) {
      await Participant.findOneAndUpdate(
        { bibNo },
        { $set: { lapCount: lap + 1 } },
        { new: true }
      ).exec();
      console.log(`Simulated start line scan -> lapCount=${lap + 1}`);
    }
  }

  await EventResults.insertMany(docs);

  console.log(
    `Attempt success: ${successCount}/${totalAttempts} = ${(successCount / totalAttempts * 100).toFixed(1)}% (target ~${(successRate * 100).toFixed(1)}%).`
  );

  // Compute scoring doc for G8 (best attempt per obstID by max points).
  const insertedEvents = await EventResults.find({ bibNo })
    .lean()
    .exec();

  // Compute lap durations from "all results" semantics:
  // - lap start = earliest timestamp for lapCount == L
  // - lap finish = earliest timestamp for lapCount == L+1 (if present), else latest within lap L
  const lapStats = new Map(); // lap -> { minMs, maxMs }
  let maxLapSeen = 0;
  for (const ev of insertedEvents) {
    const lap = Number(ev.lapCount || 0);
    if (!Number.isFinite(lap) || lap <= 0) continue;
    maxLapSeen = Math.max(maxLapSeen, lap);
    const t = ev.timestamp instanceof Date ? ev.timestamp.getTime() : new Date(ev.timestamp).getTime();
    if (!Number.isFinite(t)) continue;
    const prev = lapStats.get(lap);
    if (!prev) {
      lapStats.set(lap, { minMs: t, maxMs: t });
    } else {
      prev.minMs = Math.min(prev.minMs, t);
      prev.maxMs = Math.max(prev.maxMs, t);
    }
  }

  const lapsToReport = Math.max(1, Math.min(laps, maxLapSeen || laps));
  console.log('Lap durations (derived from all scan rows):');
  for (let lap = 1; lap <= lapsToReport; lap++) {
    const cur = lapStats.get(lap);
    if (!cur) {
      console.log(`  Lap ${lap}: —`);
      continue;
    }
    const next = lapStats.get(lap + 1);
    const startMs = cur.minMs;
    // Your request: use participant `finishTime` as the end time.
    // Since the participant schema stores only one overall `finishTime`, we apply it to the final lap.
    let finishMs;
    if (lap === lapsToReport && Number.isFinite(participantFinishMs)) {
      finishMs = participantFinishMs;
    } else {
      finishMs = next ? next.minMs : cur.maxMs;
    }
    const duration = finishMs - startMs;
    console.log(
      `  Lap ${lap}: start=${msToClock(startMs)} finish=${msToClock(finishMs)} duration=${formatDurationMs(duration)}`
    );
  }

  // Re-fetch sorted events for scoring calculation (best attempt per obstID per lap for G8).
  const insertedEventsForScoring = await EventResults.find({ bibNo })
    .sort({ lapCount: 1, obstID: 1, points: -1 })
    .lean()
    .exec();

  let g1 = 0;
  let g2 = 0;
  let g3 = 0;
  let currentObstKey = null;
  for (const ev of insertedEventsForScoring) {
    const obstKey = `${ev.lapCount}:${ev.obstID}`;
    if (obstKey === currentObstKey) continue;
    currentObstKey = obstKey;

    if (ev.success === true && ev.countScore === true) {
      if (Number(ev.tier) === 1) g1++;
      else if (Number(ev.tier) === 2) g2++;
      else if (Number(ev.tier) === 3) g3++;
    }
  }

  const score = g1 * 1.0000001 + g2 * 3.00001 + g3 * 5.001;
  const eventsCount = insertedEventsForScoring.length;
  const progress = `${eventsCount}/??`;
  const next = eventsCount + 1;

  const participantHtml = `<a href='/individual/?id=${bibNo}'>${participant.lastName}, ${participant.firstName}</a>`;

  await Scoring.create({
    participant: participantHtml,
    bibNo,
    firstName: participant.firstName,
    lastName: participant.lastName,
    gender: participant.gender,
    group: participant.group,
    teamID: participant.teamID,
    isDavid: participant.isDavid,
    g8: true,
    lapScore: participant.lapScore,
    g1,
    g2,
    g3,
    score,
    updatedOn: new Date(),
    progress,
    obstaclesCompleted: eventsCount,
    next,
    tiebreaker: 999.99,
  });

  console.log(`Inserted ${docs.length} scan records (${laps} laps).`);
  console.log(`G8 score: g1=${g1}, g2=${g2}, g3=${g3}, score=${score}.`);
  console.log('Done.');

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

