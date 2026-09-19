/**
 * Local G8 dashboard dev server.
 *
 * - Serves the G8 UI from this folder
 * - Computes /api/scoring/g8 locally with lap-aware scoring (no deploy needed)
 * - Proxies other read APIs to production
 *
 * Usage: npm run g8:dev
 * Open:  http://localhost:5180/local.html
 */

const express = require('express');
const path = require('path');
const http = require('http');
const https = require('https');

const PROD = (process.env.G8_API_BASE || 'https://blooming-ridge-76065.herokuapp.com').replace(/\/$/, '');
const PORT = Number(process.env.G8_DEV_PORT) || 5180;
const staticDir = __dirname;

function computeG8TotalsFromEvents(events) {
  let g1 = 0;
  let g2 = 0;
  let g3 = 0;
  let currentObstKey = null;

  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    const obstKey = `${ev.lapCount}:${ev.obstID}`;
    if (obstKey === currentObstKey) continue;
    currentObstKey = obstKey;

    if (ev.success === true && ev.countScore === true) {
      if (Number(ev.tier) === 1) g1++;
      else if (Number(ev.tier) === 2) g2++;
      else if (Number(ev.tier) === 3) g3++;
    }
  }

  return {
    g1,
    g2,
    g3,
    score: g1 * 1.0000001 + g2 * 3.00001 + g3 * 5.001,
    obstaclesCompleted: events.length,
  };
}

function sortEventsForG8(events) {
  return events.slice().sort((a, b) => {
    if (a.lapCount !== b.lapCount) return a.lapCount - b.lapCount;
    if (a.obstID !== b.obstID) return a.obstID - b.obstID;
    return b.points - a.points;
  });
}

function fetchJson(urlPath) {
  return new Promise((resolve, reject) => {
    const target = new URL(PROD + urlPath);
    const lib = target.protocol === 'https:' ? https : http;

    lib
      .get(target, (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            reject(new Error(`${urlPath} returned ${res.statusCode}`));
            return;
          }
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(new Error(`Invalid JSON from ${urlPath}`));
          }
        });
      })
      .on('error', reject);
  });
}

function proxyToProd(req, res) {
  const target = new URL(PROD + req.originalUrl);
  const lib = target.protocol === 'https:' ? https : http;

  const proxyReq = lib.request(
    target,
    {
      method: req.method,
      headers: {
        accept: req.headers.accept || 'application/json',
      },
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    }
  );

  proxyReq.on('error', (e) => {
    res.status(502).json({ message: e.message });
  });

  req.pipe(proxyReq);
}

const app = express();

// Same-origin API for dev server (overrides local.config.js on disk).
app.get('/local.config.js', (req, res) => {
  res.type('application/javascript');
  res.send("window.G8_API_BASE = '';");
});

app.get('/api/scoring/g8', async (req, res) => {
  try {
    const meta = await fetchJson('/api/scoring/g8');
    const roster = Array.isArray(meta.participantScores) ? meta.participantScores : [];

    const participantScores = await Promise.all(
      roster.map(async (row) => {
        const results = await fetchJson(`/scoring/results/${row.bibNo}/all`);
        const events = sortEventsForG8(results.participantResults || []);
        const totals = computeG8TotalsFromEvents(events);
        return {
          bibNo: row.bibNo,
          firstName: row.firstName,
          lastName: row.lastName,
          group: row.group,
          gender: row.gender,
          g1: totals.g1,
          g2: totals.g2,
          g3: totals.g3,
          score: totals.score,
          obstaclesCompleted: totals.obstaclesCompleted,
        };
      })
    );

    participantScores.sort((a, b) => b.score - a.score);
    res.json({ participantScores });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message || 'Failed to build G8 leaderboard' });
  }
});

app.use(['/participant', '/scoring', '/obstacle-details'], proxyToProd);
app.use(express.static(staticDir));

app.get('/', (req, res) => {
  res.redirect('/local.html');
});

app.listen(PORT, () => {
  console.log('');
  console.log('  G8 local dev server');
  console.log(`  UI:      http://localhost:${PORT}/local.html`);
  console.log('  Scoring: /api/scoring/g8 computed locally (lap-aware totals)');
  console.log(`  Data:    other APIs proxied from ${PROD}`);
  console.log('');
});
