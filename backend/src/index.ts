import { app } from './app';
import { config } from './config';

const server = app.listen(config.port, () => {
  console.log(`[AquaSentinel Backend] Microservice active on port ${config.port}`);
  console.log(`[AquaSentinel Backend] Environment: ${config.env}`);
});

process.on('SIGTERM', () => {
  console.log('[AquaSentinel Backend] SIGTERM received. Gracefully shutting down...');
  server.close(() => {
    console.log('[AquaSentinel Backend] Process terminated.');
  });
});

