import express, { Request, Response } from 'express';
import cors from 'cors';
import { requestLogger } from './middleware/logger.middleware';
import { errorHandler } from './middleware/errorHandler.middleware';
import apiRoutes from './routes';
import farmAgentRoutes from './routes/farmAgent.routes';

export const app = express();

// Global Middleware
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(requestLogger);

// Health Check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'AquaSentinel / FinGuard Core Backend Microservice'
  });
});

// Dual API prefix mounting for both standard /api and versioned /api/v1 paths
app.use('/api', apiRoutes);
app.use('/api/v1/farms', farmAgentRoutes);

// Centralized error handling
app.use(errorHandler);
