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
  databaseDir: process.env.DATABASE_DIR || path.resolve(__dirname, '..', 'data'),
  corsOrigin: process.env.CORS_ORIGIN || '*'
};
