import express, { Request, Response } from 'express';
import cors from 'cors';
import { requestLogger } from './middleware/logger.middleware';
import { errorHandler } from './middleware/errorHandler.middleware';
import apiRoutes from './routes';

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
    service: 'AquaSentinel Backend Microservice'
  });
});

// Mount modular API routes
app.use('/api', apiRoutes);

// Centralized error handling
app.use(errorHandler);

