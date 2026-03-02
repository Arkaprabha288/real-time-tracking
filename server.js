const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const sessions = new Map();

function getSession(id) {
  if (!sessions.has(id)) {
    sessions.set(id, {
      latest: null,
      history: [],
      dashboardClients: new Set()
    });
  }
  return sessions.get(id);
}

function broadcastToDashboard(sessionId, payload) {
  const session = getSession(sessionId);
  const data = `data: ${JSON.stringify(payload)}\n\n`;

  for (const client of session.dashboardClients) {
    client.write(data);
  }
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(data));
}

function serveFile(filePath, res) {
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }

    const ext = path.extname(filePath);
    const contentType = {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8'
    }[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
}

const server = http.createServer((req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'POST' && requestUrl.pathname === '/api/session') {
    const id = crypto.randomBytes(8).toString('hex');
    getSession(id);
    sendJson(res, 201, { id, trackingLink: `${requestUrl.origin}/share/${id}` });
    return;
  }

  if (req.method === 'POST' && requestUrl.pathname.startsWith('/api/location/')) {
    const sessionId = requestUrl.pathname.split('/').pop();

    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1e6) {
        req.destroy();
      }
    });

    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const session = getSession(sessionId);
        const point = {
          latitude: Number(payload.latitude),
          longitude: Number(payload.longitude),
          accuracy: Number(payload.accuracy),
          timestamp: Number(payload.timestamp) || Date.now()
        };

        if (![point.latitude, point.longitude, point.accuracy, point.timestamp].every(Number.isFinite)) {
          sendJson(res, 400, { error: 'Invalid location payload.' });
          return;
        }

        session.latest = point;
        session.history.push(point);
        if (session.history.length > 200) {
          session.history.shift();
        }

        broadcastToDashboard(sessionId, { type: 'location', point });
        sendJson(res, 200, { ok: true });
      } catch (_error) {
        sendJson(res, 400, { error: 'Invalid JSON body.' });
      }
    });
    return;
  }

  if (req.method === 'GET' && requestUrl.pathname.startsWith('/api/dashboard-stream/')) {
    const sessionId = requestUrl.pathname.split('/').pop();
    const session = getSession(sessionId);

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    });
    res.write('\n');

    session.dashboardClients.add(res);

    if (session.latest) {
      res.write(`data: ${JSON.stringify({ type: 'location', point: session.latest })}\n\n`);
    }

    req.on('close', () => {
      session.dashboardClients.delete(res);
    });
    return;
  }

  if (req.method === 'GET' && requestUrl.pathname.startsWith('/api/location/')) {
    const sessionId = requestUrl.pathname.split('/').pop();
    const session = getSession(sessionId);
    sendJson(res, 200, {
      latest: session.latest,
      history: session.history
    });
    return;
  }

  if (req.method === 'GET' && requestUrl.pathname === '/') {
    serveFile(path.join(PUBLIC_DIR, 'index.html'), res);
    return;
  }

  if (req.method === 'GET' && requestUrl.pathname.startsWith('/share/')) {
    serveFile(path.join(PUBLIC_DIR, 'share.html'), res);
    return;
  }

  const staticPath = path.normalize(path.join(PUBLIC_DIR, requestUrl.pathname));
  if (staticPath.startsWith(PUBLIC_DIR)) {
    serveFile(staticPath, res);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`Real-time tracking app running at http://localhost:${PORT}`);
});
