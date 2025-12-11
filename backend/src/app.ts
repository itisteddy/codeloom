import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { config } from 'dotenv';
import { config as appConfig } from './config';
import { healthRouter } from './routes/health';
import { authRouter } from './routes/auth';
import { practicesRouter } from './routes/practices';
import { encountersRouter } from './routes/encounters';
import { trainingRouter } from './routes/training';
import { exportsRouter } from './routes/exports';
import { analyticsRouter } from './routes/analytics';
import { systemRouter } from './routes/system';
import { llmAdminRouter } from './routes/llmAdmin';
import { planRouter } from './routes/plan';
import { practiceConfigRouter } from './routes/practiceConfig';
import { onboardingRouter } from './routes/onboarding';
import { pilotSummaryRouter } from './routes/pilotSummary';
import { invitationsRouter } from './routes/invitations';
import { inviteAcceptRouter } from './routes/inviteAccept';
import { pilotAdminRouter } from './routes/pilotAdmin';
import { npsRouter } from './routes/nps';
import adminRouter from './routes/admin';
import meRouter from './routes/me';
import devRouter from './routes/dev';
import { metricsMiddleware } from './middleware/metrics';
import { requestLoggerMiddleware } from './middleware/requestLogger';

config();

const app = express();

// CORS configuration - allow multiple origins for production
const allowedOrigins = [
  appConfig.frontendUrl,
  'https://codeloom-frontend-seven.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
].filter(Boolean); // Remove any undefined/null values

// Log allowed origins for debugging
console.log('CORS allowed origins:', allowedOrigins);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      // Check if origin is in allowed list
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      // In development, allow all origins
      if (appConfig.isDev) {
        return callback(null, true);
      }
      
      // For production, reject with false instead of throwing error
      // This returns proper CORS headers instead of crashing
      console.warn(`CORS blocked request from origin: ${origin}`);
      return callback(null, false);
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(morgan('dev'));
app.use(metricsMiddleware);
app.use(requestLoggerMiddleware);

app.use('/api/auth', authRouter);
app.use('/api/practices', practicesRouter);
app.use('/api/encounters', encountersRouter);
app.use('/api/training', trainingRouter);
app.use('/api/exports', exportsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/system', systemRouter);
app.use('/api/admin', llmAdminRouter);
app.use('/api/admin', adminRouter);
app.use('/api/admin/onboarding', onboardingRouter);
app.use('/api/admin/practices', invitationsRouter);
app.use('/api/admin/pilot', pilotAdminRouter);
app.use('/api/admin/pilot', pilotSummaryRouter);
app.use('/api', planRouter);
app.use('/api', npsRouter);
app.use('/api/practice', practiceConfigRouter);
app.use('/api/invite', inviteAcceptRouter);
app.use('/api/me', meRouter);
app.use('/api/dev', devRouter);
app.use('/health', healthRouter);

export default app;

