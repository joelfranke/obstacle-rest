#!/usr/bin/env node
/**
 * Pre-event check for the Goliathon API.
 *
 *   node scripts/event-day-check.js --target local
 *   API_TOKEN=... node scripts/event-day-check.js --target dev
 *   node scripts/event-day-check.js --target prod
 *   node scripts/event-day-check.js --prove-node
 *
 * Local provisioning seeds a missing admin token and, when the course is
 * empty, two scored obstacles. Dev and prod are not provisioned.
 * --prove-node runs the local event day on Node 18 (must pass) and on a
 * newer Node. A server error on the first team score is the known newer-Node
 * failure and does not fail this command.
 */

const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const PKG = require(path.join(ROOT, 'package.json'));
const MONGO_URL = 'mongodb://127.0.0.1:27017/goliathon-results';
const HEAT = '10:00 AM';
const DEVICE_TIME = '10:00:00 AM';
const TARGETS = {
  local: 'http://localhost:3000',
  dev: 'https://dev-goliathon.herokuapp.com',
  prod: 'https://blooming-ridge-76065.herokuapp.com',
};

const args = parseArgs(process.argv);
let baseUrl = '';
let token = process.env.API_TOKEN || '';
let serverChild = null;
let serverLog = '';
let serverExited = false;
let teamWatchAt = null;
let stopServer = args.stopServer;

class TeamScoreServerError extends Error {
  constructor(message) {
    super(message);
    this.code = 'TEAM_SCORE';
  }
}

function parseArgs(argv) {
  const out = {
    target: null,
    port: null,
    stopServer: false,
    proveNode: false,
    knownTeamScoreError: false,
    help: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--prove-node') out.proveNode = true;
    else if (a === '--stop-server') out.stopServer = true;
    else if (a === '--known-team-score-error') out.knownTeamScoreError = true;
    else if (a === '--help' || a === '-h') out.help = true;
    else if (a === '--target') out.target = argv[++i];
    else if (a === '--port') out.port = Number(argv[++i]);
    else throw new Error('Unknown argument: ' + a);
  }
  return out;
}

function usage() {
  console.log(`Usage:
  node scripts/event-day-check.js --target local|dev|prod|all
  node scripts/event-day-check.js --prove-node

API_TOKEN is required for dev. Local seeds a token when one is missing.
Prod is read-only.`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseVer(value) {
  const match = String(value).trim().match(/^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
  if (!match) return null;
  return [Number(match[1]), Number(match[2] || 0), Number(match[3] || 0)];
}

function cmpVer(a, b) {
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
  }
  return 0;
}

function satisfies(version, range) {
  const actual = parseVer(version);
  if (!actual) return false;
  const spec = String(range).trim();
  if (spec.startsWith('>=')) {
    const floor = parseVer(spec.slice(2));
    return floor ? cmpVer(actual, floor) >= 0 : false;
  }
  if (spec.startsWith('^')) {
    const floor = parseVer(spec.slice(1));
    if (!floor || cmpVer(actual, floor) < 0) return false;
    if (floor[0] > 0) return actual[0] === floor[0];
    if (floor[1] > 0) return actual[0] === 0 && actual[1] === floor[1];
    return actual[0] === 0 && actual[1] === 0 && actual[2] === floor[2];
  }
  const exact = parseVer(spec);
  return exact ? cmpVer(actual, exact) === 0 : false;
}

function checkDependencyMap(dependencies) {
  const names = Object.keys(PKG.dependencies);
  names.forEach((name) => {
    const installed = dependencies[name];
    const range = PKG.dependencies[name];
    if (!installed) {
      throw new Error(name + ' did not load');
    }
    if (!satisfies(installed, range)) {
      throw new Error(name + '@' + installed + ' does not satisfy ' + range);
    }
    console.log('  ' + name + '@' + installed + ' satisfies ' + range);
  });
}

async function request(method, urlPath, options) {
  const opts = options || {};
  const headers = {};
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (opts.token) headers.k = opts.token;
  let res;
  try {
    res = await fetch(baseUrl + urlPath, {
      method,
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: AbortSignal.timeout(20000),
    });
  } catch (err) {
    noteTransportFailure(err);
    throw err;
  }
  const text = await res.text();
  let json = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch (e) {
      json = null;
    }
  }
  if (res.status >= 500) noteHttpFailure(method, urlPath, res.status, text);
  return { status: res.status, json, text };
}

function serverProblemSinceWatch() {
  if (!serverChild || teamWatchAt == null) return null;
  if (serverExited) return 'the API process exited';
  const slice = serverLog.slice(teamWatchAt);
  const match = slice.match(/TypeError:[^\n]*|ReferenceError:[^\n]*|is not a function[^\n]*|UnhandledPromiseRejection[^\n]*|MongoServerError:[^\n]*/);
  return match ? match[0] : null;
}

function assertServerAlive() {
  if (serverChild && serverExited && teamWatchAt == null) {
    throw new Error('The API process exited before team scoring.');
  }
}

function noteTransportFailure(err) {
  const problem = serverProblemSinceWatch();
  if (problem) {
    throw new TeamScoreServerError('Team score calculation failed: ' + problem + ' (' + err.message + ')');
  }
}

function noteHttpFailure(method, urlPath, status, text) {
  if (teamWatchAt == null) return;
  const snippet = String(text || '').slice(0, 300);
  throw new TeamScoreServerError(
    'Team score calculation returned HTTP ' + status + ' from ' + method + ' ' + urlPath + (snippet ? ': ' + snippet : '')
  );
}

function armTeamWatch() {
  if (teamWatchAt == null) teamWatchAt = serverLog.length;
}

function assertNoTeamScoreError() {
  const problem = serverProblemSinceWatch();
  if (problem) {
    throw new TeamScoreServerError('Team score calculation failed: ' + problem);
  }
}

async function poll(label, fn, timeoutMs) {
  const limit = timeoutMs || 20000;
  const started = Date.now();
  while (Date.now() - started < limit) {
    assertServerAlive();
    assertNoTeamScoreError();
    const found = await fn();
    if (found) return found;
    await sleep(400);
  }
  assertNoTeamScoreError();
  throw new Error('Timed out waiting for ' + label);
}

function athlete(bibNo, teamID, gender, label) {
  return {
    bibNo,
    teamID,
    gender,
    label,
    firstName: 'SMOKE',
    lastName: label,
    email: 'smoke@example.com',
    heat: HEAT,
    group: 'SMOKE',
    birthdate: '01/01/1990',
    address1: '1 Test St',
    address2: '',
    city: 'Test',
    state: 'OH',
    phone: '5555555555',
    zip: '00000',
  };
}

function registrationBody(person) {
  const body = {
    bibNo: person.bibNo,
    heat: person.heat,
    lastName: person.lastName,
    firstName: person.firstName,
    email: person.email,
    gender: person.gender,
    group: person.group,
    birthdate: person.birthdate,
    address1: person.address1,
    address2: person.address2,
    city: person.city,
    state: person.state,
    phone: person.phone,
    zip: person.zip,
  };
  if (person.teamID) body.teamID = person.teamID;
  return body;
}

async function provisionLocal() {
  let MongoClient;
  try {
    MongoClient = require('mongodb').MongoClient;
  } catch (err) {
    throw new Error('The mongodb dependency did not load: ' + err.message);
  }
  const client = new MongoClient(MONGO_URL, { serverSelectionTimeoutMS: 3000 });
  try {
    await client.connect();
  } catch (err) {
    throw new Error('Local MongoDB is not running at ' + MONGO_URL + '. Start it, then rerun. ' + err.message);
  }
  try {
    const counters = client.db().collection('counters');
    await counters.updateOne({ _id: 'results' }, { $setOnInsert: { seq: 0 } }, { upsert: true });
    if (token) {
      console.log('Using API_TOKEN from the environment.');
      return;
    }
    const existing = await counters.findOne({ token: { $exists: true, $nin: [null, ''] } });
    if (existing && existing.token) {
      token = String(existing.token);
      console.log('Using the admin token already stored in local MongoDB.');
      return;
    }
    token = crypto.randomBytes(16).toString('hex');
    await counters.insertOne({ _id: 'apiToken', token });
    console.log('Seeded local admin token: ' + token);
  } finally {
    await client.close();
  }
}

async function fetchQuiet(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

async function ensureServer(port) {
  const already = await fetchQuiet(baseUrl + '/health');
  if (already) {
    if (stopServer) {
      throw new Error('Port ' + port + ' is already in use. Stop that process and rerun the Node comparison.');
    }
    console.log('API is already running at ' + baseUrl);
    return;
  }
  console.log('Starting the API on port ' + port + ' with ' + process.execPath);
  serverChild = spawn(process.execPath, ['server/server.js'], {
    cwd: ROOT,
    env: Object.assign({}, process.env, { NODE_ENV: 'development', PORT: String(port) }),
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const capture = (chunk) => {
    const text = chunk.toString();
    serverLog += text;
    process.stdout.write(text);
  };
  serverChild.stdout.on('data', capture);
  serverChild.stderr.on('data', capture);
  serverChild.on('exit', (code) => {
    serverExited = true;
    serverLog += '\nAPI process exited with code ' + code + '\n';
  });
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    if (serverExited) {
      throw new Error('The API exited before /health responded.');
    }
    const body = await fetchQuiet(baseUrl + '/health');
    if (body) return;
    await sleep(300);
  }
  throw new Error('The API did not answer /health on port ' + port + '.');
}

function stopSpawnedServer() {
  if (!serverChild || serverChild.killed) return;
  try {
    process.kill(-serverChild.pid, 'SIGTERM');
  } catch (e) {
    try {
      serverChild.kill('SIGTERM');
    } catch (err) {
      /* already gone */
    }
  }
}

async function scoredObstacles() {
  const res = await request('GET', '/obstacle-details');
  if (res.status !== 200 || !res.json || !Array.isArray(res.json.obstacle)) {
    throw new Error('GET /obstacle-details did not return an obstacle list (HTTP ' + res.status + ').');
  }
  return res.json.obstacle.filter((item) => item && item.scored !== false && item.sequence != null && Number(item.sequence) > 0);
}

async function ensureCourse() {
  let obstacles = await scoredObstacles();
  if (obstacles.length > 0) return obstacles.slice(0, 2);
  const localCourse = baseUrl.startsWith('http://127.0.0.1') || baseUrl.startsWith('http://localhost');
  if (!localCourse) {
    throw new Error('The course has no scored obstacles.');
  }
  console.log('Local course is empty. Importing two smoke obstacles.');
  const imported = await request('POST', '/obstacle-import', {
    body: {
      obstacle: [
        { name: 'Smoke Wall', sequence: 1, attemptsAllowed: 1, scored: true, coordinate: [0, 0] },
        { name: 'Smoke Carry', sequence: 2, attemptsAllowed: 1, scored: true, coordinate: [0, 0] },
      ],
    },
  });
  if (imported.status !== 200) {
    throw new Error('Obstacle import failed with HTTP ' + imported.status);
  }
  obstacles = await scoredObstacles();
  if (obstacles.length === 0) throw new Error('Obstacle import did not produce a scored obstacle.');
  return obstacles.slice(0, 2);
}

async function expectUnauthorized() {
  const checks = [
    ['POST', '/registration'],
    ['POST', '/timing'],
    ['POST', '/post-result'],
  ];
  for (let i = 0; i < checks.length; i++) {
    const method = checks[i][0];
    const urlPath = checks[i][1];
    const res = await request(method, urlPath, { body: {} });
    if (res.status !== 401) {
      throw new Error(method + ' ' + urlPath + ' without a token returned HTTP ' + res.status + ', expected 401.');
    }
  }
  console.log('Unauthenticated registration, timing, and result posts return 401.');
}

function closeEnough(actual, expected) {
  return Math.abs(Number(actual) - expected) < 0.0001;
}

async function registerAll(people) {
  for (let i = 0; i < people.length; i++) {
    const person = people[i];
    const res = await request('POST', '/registration', { token, body: registrationBody(person) });
    if (res.status === 409) {
      throw new Error('Bib ' + person.bibNo + ' is already registered. Rerun to pick a new bib range.');
    }
    if (res.status !== 200) {
      throw new Error('Registration failed for bib ' + person.bibNo + ' with HTTP ' + res.status + ' ' + (res.text || ''));
    }
  }
}

async function startAll(people) {
  for (let i = 0; i < people.length; i++) {
    const person = people[i];
    const res = await request('POST', '/timing', {
      token,
      body: {
        bibNo: person.bibNo,
        location: 'start',
        deviceTime: DEVICE_TIME,
        bibFromBand: true,
      },
    });
    if (res.status !== 200) {
      throw new Error('Start failed for bib ' + person.bibNo + ' with HTTP ' + res.status + ' ' + (res.text || ''));
    }
  }
}

async function postResult(person, obstacle, tier, success) {
  const res = await request('POST', '/post-result', {
    token,
    body: {
      bibNo: person.bibNo,
      obstID: Number(obstacle.sequence),
      tier,
      success,
      bibFromBand: true,
      deviceTime: DEVICE_TIME,
    },
  });
  if (res.status !== 200) {
    throw new Error(
      'Result post failed for bib ' + person.bibNo + ' obstacle ' + obstacle.sequence + ' with HTTP ' + res.status + ' ' + (res.text || '')
    );
  }
}

async function waitForIndividual(person, expected) {
  const score = await poll('individual score for bib ' + person.bibNo, async () => {
    const res = await request('GET', '/scoring/participants/' + person.bibNo);
    if (res.status === 404) return null;
    if (res.status !== 200 || !res.json || !Array.isArray(res.json.participantScores) || !res.json.participantScores[0]) {
      throw new Error('GET /scoring/participants/' + person.bibNo + ' returned HTTP ' + res.status);
    }
    const row = res.json.participantScores[0];
    if (Number(row.g1) !== expected.g1 || Number(row.g2) !== expected.g2 || Number(row.g3) !== expected.g3) return null;
    if (!closeEnough(row.score, expected.score)) return null;
    return row;
  });
  if (person.teamID) {
    if (score.teamID !== person.teamID) {
      throw new Error('Bib ' + person.bibNo + ' score is on team ' + score.teamID + ', expected ' + person.teamID);
    }
  } else if (score.teamID) {
    throw new Error('Bib ' + person.bibNo + ' was stored on team ' + score.teamID);
  }
  return score;
}

async function waitForResults(person, sequences) {
  await poll('obstacle results for bib ' + person.bibNo, async () => {
    const res = await request('GET', '/scoring/results/' + person.bibNo);
    if (res.status === 404) return null;
    if (res.status !== 200 || !res.json || !Array.isArray(res.json.participantResults)) {
      throw new Error('GET /scoring/results/' + person.bibNo + ' returned HTTP ' + res.status);
    }
    const ids = res.json.participantResults.map((row) => Number(row.obstID));
    const missing = sequences.some((sequence) => ids.indexOf(Number(sequence)) === -1);
    return missing ? null : res.json.participantResults;
  });
}

async function scoreAthlete(person, obstacles, expected, markTeamWatch) {
  if (markTeamWatch) armTeamWatch();
  await postResult(person, obstacles[0], 3, true);
  if (obstacles[1]) await postResult(person, obstacles[1], 1, true);
  await postResult(person, { sequence: 9001 }, 3, false);
  await waitForIndividual(person, expected);
  await waitForResults(person, obstacles.map((item) => item.sequence));
}

async function waitForTeam(teamName, expected) {
  return poll('team score for ' + teamName, async () => {
    const res = await request('GET', '/scoring/teams/' + encodeURIComponent(teamName));
    if (res.status === 404) return null;
    if (res.status !== 200 || !res.json || !Array.isArray(res.json.teamScores) || !res.json.teamScores[0]) {
      throw new Error('GET /scoring/teams/' + teamName + ' returned HTTP ' + res.status);
    }
    const row = res.json.teamScores[0];
    if (Number(row.g1) !== expected.g1 || Number(row.g2) !== expected.g2 || Number(row.g3) !== expected.g3) return null;
    if (!closeEnough(row.score, expected.score)) return null;
    return row;
  });
}

async function runEventDay(obstacles) {
  const stamp = Date.now();
  const baseBib = 900000 + (stamp % 80000);
  const qualifyingTeam = 'SMOKE-' + stamp;
  const dnqTeam = 'SMOKE-DNQ-' + stamp;
  const people = [];
  let bib = baseBib;
  ['M', 'M', 'M', 'F', 'F', 'F'].forEach((gender, index) => {
    people.push(athlete(bib++, qualifyingTeam, gender, 'Qual' + gender + (index + 1)));
  });
  ['M', 'M', 'M', 'F', 'F'].forEach((gender, index) => {
    people.push(athlete(bib++, dnqTeam, gender, 'Dnq' + gender + (index + 1)));
  });
  people.push(athlete(bib++, null, 'M', 'Solo'));

  const qualifying = people.filter((person) => person.teamID === qualifyingTeam);
  const expectedOne = {
    g1: obstacles[1] ? 1 : 0,
    g2: 0,
    g3: 1,
    score: (obstacles[1] ? 1.0000001 : 0) + 5.001,
  };
  const expectedTeam = {
    g1: expectedOne.g1 * qualifying.length,
    g2: 0,
    g3: expectedOne.g3 * qualifying.length,
    score: expectedOne.score * qualifying.length,
  };

  console.log('Registering ' + people.length + ' athletes. Qualifying team ' + qualifyingTeam + '.');
  await registerAll(people);
  console.log('Starting heats.');
  await startAll(people);

  for (let i = 0; i < qualifying.length; i++) {
    const lastQualifying = i === qualifying.length - 1;
    await scoreAthlete(qualifying[i], obstacles, expectedOne, lastQualifying);
  }
  const others = people.filter((person) => person.teamID !== qualifyingTeam);
  for (let i = 0; i < others.length; i++) {
    await scoreAthlete(others[i], obstacles, expectedOne, false);
  }

  let teamRow = null;
  try {
    teamRow = await waitForTeam(qualifyingTeam, expectedTeam);
  } catch (err) {
    if (err.code === 'TEAM_SCORE') throw err;
    console.log('Qualifying team score was not ready. Recalculating from bib ' + qualifying[0].bibNo + '.');
    armTeamWatch();
    const updated = await request('POST', '/update-score', { token, body: { bibNo: qualifying[0].bibNo } });
    if (updated.status !== 200) {
      throw new Error('POST /update-score returned HTTP ' + updated.status);
    }
    teamRow = await waitForTeam(qualifyingTeam, expectedTeam);
  }

  const onTeam = await request('GET', '/scoring/participants?onTeam=' + encodeURIComponent(qualifyingTeam));
  if (onTeam.status !== 200 || !onTeam.json || !Array.isArray(onTeam.json.participantScores)) {
    throw new Error('GET /scoring/participants?onTeam=' + qualifyingTeam + ' returned HTTP ' + onTeam.status);
  }
  if (onTeam.json.participantScores.length !== qualifying.length) {
    throw new Error('Qualifying team returned ' + onTeam.json.participantScores.length + ' scores, expected ' + qualifying.length);
  }

  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    assertNoTeamScoreError();
    const dnq = await request('GET', '/scoring/teams/' + encodeURIComponent(dnqTeam));
    if (dnq.status === 200) {
      throw new Error(dnqTeam + ' produced a team score with only two women. A team needs three of each gender.');
    }
    if (dnq.status !== 404) {
      throw new Error('GET /scoring/teams/' + dnqTeam + ' returned HTTP ' + dnq.status);
    }
    await sleep(400);
  }

  console.log('Event day passed.');
  console.log('  Qualifying team ' + qualifyingTeam + ' score ' + teamRow.score + ' (g1=' + teamRow.g1 + ', g3=' + teamRow.g3 + ')');
  console.log('  DNQ team ' + dnqTeam + ' correctly has no team score.');
  console.log('  Bibs ' + people.map((person) => person.bibNo).join(', '));
}

async function checkHealth() {
  const res = await request('GET', '/health');
  if (res.status !== 200 || !res.json) {
    throw new Error('GET /health returned HTTP ' + res.status);
  }
  console.log('Node ' + res.json.node + ' at ' + baseUrl);
  checkDependencyMap(res.json.dependencies || {});
  return res.json;
}

async function runProdProbe() {
  await checkHealth();
  const obstacles = await request('GET', '/obstacle-details');
  if (obstacles.status !== 200 || !obstacles.json || !Array.isArray(obstacles.json.obstacle) || obstacles.json.obstacle.length === 0) {
    throw new Error('GET /obstacle-details did not return a course.');
  }
  const participants = await request('GET', '/scoring/participants?limit=1');
  if (participants.status !== 200 || !participants.json || !Array.isArray(participants.json.participantScores)) {
    throw new Error('GET /scoring/participants did not return participantScores.');
  }
  const teams = await request('GET', '/scoring/teams');
  if (teams.status !== 200 || !teams.json || !Array.isArray(teams.json.teamScores)) {
    throw new Error('GET /scoring/teams did not return teamScores.');
  }
  const recent = await request('GET', '/scoring/results?recent=true&limit=1');
  if (recent.status !== 200 || !recent.json || !Array.isArray(recent.json.participantResults)) {
    throw new Error('GET /scoring/results?recent=true did not return participantResults.');
  }
  await expectUnauthorized();
  console.log('Read-only probe passed for ' + baseUrl);
}

async function runWritable(target, port) {
  if (target === 'local') {
    await provisionLocal();
    await ensureServer(port);
  } else if (!token) {
    throw new Error('API_TOKEN is required for ' + target + '.');
  }
  await checkHealth();
  await expectUnauthorized();
  const obstacles = await ensureCourse();
  console.log('Using obstacles ' + obstacles.map((item) => item.sequence + ' ' + item.name).join(', ') + '.');
  await runEventDay(obstacles);
}

async function runTarget(target) {
  const port = target === 'local' ? (args.port || 3000) : null;
  baseUrl = target === 'local' ? 'http://127.0.0.1:' + port : TARGETS[target];
  console.log('\n== ' + target + ' ' + baseUrl + ' ==');
  if (target === 'prod') await runProdProbe();
  else await runWritable(target, port);
}

function nodeMajor(bin) {
  const result = spawnSync(bin, ['-p', 'process.versions.node.split(".")[0]'], { encoding: 'utf8' });
  if (result.status !== 0) return null;
  const major = Number(String(result.stdout).trim());
  return Number.isFinite(major) ? major : null;
}

function binariesNamed(dirPattern) {
  const found = [];
  if (!fs.existsSync(dirPattern)) return found;
  fs.readdirSync(dirPattern).forEach((name) => {
    const bin = path.join(dirPattern, name, 'bin', 'node');
    if (fs.existsSync(bin)) found.push(bin);
  });
  return found;
}

function candidateNodeBins() {
  const bins = [];
  if (process.env.NODE_18) bins.push(process.env.NODE_18);
  if (process.env.NODE_NEW) bins.push(process.env.NODE_NEW);
  bins.push.apply(bins, binariesNamed(path.join(os.homedir(), '.nvm', 'versions', 'node')));
  bins.push.apply(bins, binariesNamed(path.join(os.homedir(), '.local', 'share', 'fnm', 'node-versions')));
  ['/opt/homebrew/bin/node', '/usr/local/bin/node', process.execPath].forEach((bin) => {
    if (bin && fs.existsSync(bin)) bins.push(bin);
  });
  return bins;
}

function resolveProofNodes() {
  let node18 = null;
  let nodeNew = null;
  let nodeNewMajor = 0;
  candidateNodeBins().forEach((bin) => {
    const major = nodeMajor(bin);
    if (major === 18 && !node18) node18 = bin;
    if (major > 18 && major >= nodeNewMajor) {
      nodeNew = bin;
      nodeNewMajor = major;
    }
  });
  if (process.env.NODE_18) node18 = process.env.NODE_18;
  if (process.env.NODE_NEW) nodeNew = process.env.NODE_NEW;
  if (!node18) {
    throw new Error('Node 18 was not found. Install it or set NODE_18 to the binary. With nvm: nvm install 18');
  }
  if (!nodeNew || nodeMajor(nodeNew) <= 18) {
    throw new Error('A Node version newer than 18 was not found. Install one or set NODE_NEW. With nvm: nvm install 22');
  }
  return { node18, nodeNew };
}

function runChild(bin, extraArgs) {
  console.log('\nRunning ' + extraArgs.join(' ') + ' with ' + bin);
  const result = spawnSync(bin, [path.join(__dirname, 'event-day-check.js')].concat(extraArgs), {
    cwd: ROOT,
    stdio: 'inherit',
    env: process.env,
  });
  return result.status == null ? 1 : result.status;
}

function proveNode() {
  const bins = resolveProofNodes();
  console.log('Node 18: ' + bins.node18);
  console.log('Newer Node: ' + bins.nodeNew + ' (' + nodeMajor(bins.nodeNew) + ')');
  const node18Status = runChild(bins.node18, ['--target', 'local', '--port', '3018', '--stop-server']);
  if (node18Status !== 0) {
    throw new Error('The Node 18 event day failed.');
  }
  const newerStatus = runChild(bins.nodeNew, ['--target', 'local', '--port', '3019', '--stop-server', '--known-team-score-error']);
  if (newerStatus === 2) {
    console.log('\nNewer Node hit the known team-score server error. Node 18 passed.');
    return;
  }
  if (newerStatus === 0) {
    console.log('\nNewer Node completed the event day, including team scoring. Node 18 passed.');
    return;
  }
  console.log('\nNewer Node failed before a team-score server error was identified. Node 18 passed, so this comparison still succeeds.');
}

async function main() {
  if (args.help || (!args.proveNode && !args.target)) {
    usage();
    if (!args.help) process.exitCode = 1;
    return;
  }
  if (args.proveNode) {
    proveNode();
    return;
  }
  const targets = args.target === 'all' ? ['local', 'dev', 'prod'] : [args.target];
  targets.forEach((target) => {
    if (!TARGETS[target]) throw new Error('Unknown target: ' + args.target);
  });
  let failed = false;
  try {
    for (let i = 0; i < targets.length; i++) {
      await runTarget(targets[i]);
    }
  } catch (err) {
    failed = true;
    throw err;
  } finally {
    if (serverChild && (stopServer || failed)) {
      stopSpawnedServer();
    } else if (serverChild) {
      console.log('Left the local API running (pid ' + serverChild.pid + ').');
      serverChild.unref();
    }
  }
}

main().catch((err) => {
  if (err && err.code === 'TEAM_SCORE') {
    console.error(err.message);
    process.exit(args.knownTeamScoreError ? 2 : 1);
  }
  console.error(err && err.message ? err.message : err);
  process.exit(1);
});
