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
import { metricsMiddleware } from './middleware/metrics';
import { requestLoggerMiddleware } from './middleware/requestLogger';

config();

const app = express();

app.use(cors({ origin: appConfig.frontendUrl }));
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
app.use('/health', healthRouter);

export default app;

