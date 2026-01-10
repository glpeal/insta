import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

export const config = {
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',

  database: {
    path: process.env.DB_PATH || './instagram_dm.db'
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10)
  },

  rateLimiting: {
    maxDmPerHour: parseInt(process.env.MAX_DM_PER_HOUR || '30', 10),
    minDelaySeconds: parseInt(process.env.MIN_DELAY_SECONDS || '10', 10),
    maxDelaySeconds: parseInt(process.env.MAX_DELAY_SECONDS || '90', 10)
  },

  security: {
    encryptionKey: process.env.ENCRYPTION_KEY || 'default_key_change_in_production'
  },

  browser: {
    headless: process.env.HEADLESS === 'true',
    dataDir: process.env.BROWSER_DATA_DIR || './.browser-data'
  }
};
