import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  geminiApiKey: process.env.GEMINI_API_KEY || process.env.API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  databaseDir: process.env.DATABASE_DIR || path.resolve(__dirname, '..', 'data'),
  corsOrigin: process.env.CORS_ORIGIN || '*',
  
  // FarmAgent (Maritime.sh micro-VM service) configuration
  farmAgentBaseUrl: process.env.FARMAGENT_BASE_URL || 'http://localhost:8080',
  farmAgentServiceKey: process.env.FARMAGENT_SERVICE_KEY || 'finguard-internal-secret-key-2026',
  farmAgentTimeoutMs: parseInt(process.env.FARMAGENT_TIMEOUT_MS || '15000', 10),

  // Prune Gateway model routing configuration
  pruneApiKey: process.env.PRUNE_API_KEY || '',
  pruneBaseUrl: process.env.PRUNE_BASE_URL || 'https://api.withprune.com/v1',
  pruneEnabled: process.env.PRUNE_ENABLED === 'true',
  pruneModel: process.env.PRUNE_MODEL || 'gemini-2.5-flash',
  pruneAllowDirectFallback: process.env.PRUNE_ALLOW_DIRECT_FALLBACK !== 'false'
};
