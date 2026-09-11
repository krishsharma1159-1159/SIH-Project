import express from 'express';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;
const FASTAPI_PORT = 8000;
const FASTAPI_BASE = `http://127.0.0.1:${FASTAPI_PORT}`;

// Middleware
app.use(express.json());

// Spawn Python FastAPI backend process
let pythonProcess: ChildProcess | null = null;

function startPythonBackend() {
  console.log('[Server] Launching Python FastAPI backend on port ' + FASTAPI_PORT + '...');
  pythonProcess = spawn(
    'python3',
    ['-m', 'uvicorn', 'backend.main:app', '--host', '127.0.0.1', '--port', String(FASTAPI_PORT)],
    {
      stdio: 'inherit',
      env: { ...process.env },
    }
  );

  pythonProcess.on('error', (err) => {
    console.error('[Server] Failed to start Python FastAPI process:', err);
  });

  pythonProcess.on('exit', (code, signal) => {
    console.log(`[Server] Python FastAPI process exited with code ${code}, signal ${signal}`);
  });
}

// Start backend
startPythonBackend();

// Clean exit handlers
process.on('SIGINT', () => {
  if (pythonProcess) pythonProcess.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  if (pythonProcess) pythonProcess.kill('SIGTERM');
  process.exit(0);
});

// Proxy helper for FastAPI
async function proxyToFastAPI(req: express.Request, res: express.Response, targetPath: string) {
  try {
    const url = new URL(targetPath, FASTAPI_BASE);
    // Copy query params
    for (const [key, val] of Object.entries(req.query)) {
      if (typeof val === 'string') {
        url.searchParams.set(key, val);
      } else if (Array.isArray(val)) {
        val.forEach((v) => {
          if (typeof v === 'string') url.searchParams.append(key, v);
        });
      }
    }

    const headers: Record<string, string> = {
      'Content-Type': req.headers['content-type'] || 'application/json',
      Accept: 'application/json',
    };

    const fetchOptions: RequestInit = {
      method: req.method,
      headers,
    };

    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const response = await fetch(url.toString(), fetchOptions);
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err: any) {
    console.error(`[Server] Error proxying to ${targetPath}:`, err.message);
    // Resilient fallback status
    return res.status(503).json({
      error: 'BACKEND_INITIALIZING',
      message: 'Python meteorological backend is initializing or unreachable. Please retry in a few moments.',
      details: err.message,
    });
  }
}

// -----------------------------------------------------------------------------
// API Routes (must precede Vite middleware)
// -----------------------------------------------------------------------------
app.get('/api/health', (req, res) => proxyToFastAPI(req, res, '/health'));
app.get('/api/data/status', (req, res) => proxyToFastAPI(req, res, '/data/status'));
app.get('/api/model/info', (req, res) => proxyToFastAPI(req, res, '/model/info'));
app.post('/api/predict', (req, res) => proxyToFastAPI(req, res, '/predict'));
app.get('/api/prediction/latest', (req, res) => proxyToFastAPI(req, res, '/prediction/latest'));
app.get('/api/xai/:id', (req, res) => proxyToFastAPI(req, res, `/xai/${req.params.id}`));
app.get('/api/metadata', (req, res) => proxyToFastAPI(req, res, '/metadata'));

// Additional operational endpoints
app.post('/api/mosdac/search', (req, res) => proxyToFastAPI(req, res, '/data/mosdac/search'));
app.post('/api/audit/run', (req, res) => proxyToFastAPI(req, res, '/data/audit/run'));

// Direct root routes matching FastAPI specification
app.get('/health', (req, res) => proxyToFastAPI(req, res, '/health'));
app.get('/data/status', (req, res) => proxyToFastAPI(req, res, '/data/status'));
app.get('/model/info', (req, res) => proxyToFastAPI(req, res, '/model/info'));
app.post('/predict', (req, res) => proxyToFastAPI(req, res, '/predict'));
app.get('/prediction/latest', (req, res) => proxyToFastAPI(req, res, '/prediction/latest'));
app.get('/xai/:id', (req, res) => proxyToFastAPI(req, res, `/xai/${req.params.id}`));
app.get('/metadata', (req, res) => proxyToFastAPI(req, res, '/metadata'));

// -----------------------------------------------------------------------------
// Vite Middleware / Static Serving
// -----------------------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[MEGHNETRA] Integrated Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
