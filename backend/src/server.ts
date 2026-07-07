import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { logger } from './config/logger';
import { pool } from './db/client';
import authRoutes from './routes/authRoutes';
import profileRoutes from './routes/profileRoutes';
import recordRoutes from './routes/recordRoutes';
import clinicalRoutes from './routes/clinicalRoutes';
import consentRoutes from './routes/consentRoutes';
import emergencyRoutes from './routes/emergencyRoutes';
import fhirRoutes from './routes/fhirRoutes';
import auditRoutes from './routes/auditRoutes';
import aiRoutes from './routes/aiRoutes';
import adminRoutes from './routes/adminRoutes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { requestContext } from './middleware/requestContext';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(requestContext);
  app.use(
    helmet({
      crossOriginResourcePolicy: false,
    }),
  );
  app.use(
    cors({
      origin: env.corsOrigin,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 300,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'lifeledger-api' });
  });

  app.get('/api/v1/health', (_req, res) => {
    res.json({ status: 'ok', service: 'lifeledger-api', storage: 'private' });
  });

  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/profile', profileRoutes);
  app.use('/api/v1/records', recordRoutes);
  app.use('/api/v1/clinical-entries', clinicalRoutes);
  app.use('/api/v1/consents', consentRoutes);
  app.use('/api/v1/emergency', emergencyRoutes);
  app.use('/api/v1/fhir', fhirRoutes);
  app.use('/api/v1/audit', auditRoutes);
  app.use('/api/v1/ai', aiRoutes);
  app.use('/api/v1/admin', adminRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

if (require.main === module) {
  const app = createApp();
  const server = app.listen(env.port, () => {
    logger.info('LifeLedger API listening', {
      port: env.port,
      nodeEnv: env.nodeEnv,
    });
  });

  const shutdown = async () => {
    logger.info('Shutting down LifeLedger API');
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
