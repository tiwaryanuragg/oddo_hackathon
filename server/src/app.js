import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import routes from './routes/index.js';

export function createApp() {
  const app = express();

  app.use(cors({ origin: process.env.CLIENT_ORIGIN || '*' }));
  app.use(express.json({ limit: '5mb' }));
  app.use(morgan('dev'));

  app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'assetflow-api' }));
  app.use('/api', routes);

  // 404
  app.use((req, res) => res.status(404).json({ error: 'Not found', path: req.path }));

  // Central error handler
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    const status = err.status || 500;
    if (status >= 500) console.error('[error]', err);
    res.status(status).json({ error: err.message || 'Server error' });
  });

  return app;
}