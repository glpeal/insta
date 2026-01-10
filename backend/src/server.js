import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from './config/config.js';
import { initDatabase } from './database/db.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { logger } from './utils/logger.js';

// Controllers
import {
  loginController,
  restoreSessionController,
  checkSessionController,
  logoutController,
  sendTestDmController
} from './controllers/instagram.controller.js';

import {
  getSettingsController,
  updateSettingsController
} from './controllers/settings.controller.js';

import {
  getDmLogsController,
  getSystemLogsController,
  getTrackedCommentsController
} from './controllers/logs.controller.js';

import {
  getStatusController,
  healthCheckController
} from './controllers/status.controller.js';

// Initialize Express app
const app = express();

// Security middleware
app.use(helmet());
app.use(cors());

// Request logging
app.use(morgan('dev'));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

app.use('/api/', limiter);

// Initialize database
initDatabase();

// Health check
app.get('/api/health', healthCheckController);

// Instagram routes
app.post('/api/instagram/login', loginController);
app.post('/api/instagram/restore-session', restoreSessionController);
app.get('/api/instagram/check-session', checkSessionController);
app.post('/api/instagram/logout', logoutController);
app.post('/api/instagram/send-test-dm', sendTestDmController);

// Settings routes
app.get('/api/settings', getSettingsController);
app.put('/api/settings', updateSettingsController);

// Logs routes
app.get('/api/logs/dm', getDmLogsController);
app.get('/api/logs/system', getSystemLogsController);
app.get('/api/logs/comments', getTrackedCommentsController);

// Status route
app.get('/api/status', getStatusController);

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const PORT = config.port;

app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📝 Environment: ${config.nodeEnv}`);
  logger.info(`🗄️  Database: ${config.database.path}`);
  logger.info(`\n✅ Instagram DM Panel Backend is ready!`);
  logger.info(`\nAPI Endpoints:`);
  logger.info(`  POST   /api/instagram/login`);
  logger.info(`  POST   /api/instagram/restore-session`);
  logger.info(`  GET    /api/instagram/check-session`);
  logger.info(`  POST   /api/instagram/logout`);
  logger.info(`  POST   /api/instagram/send-test-dm`);
  logger.info(`  GET    /api/settings`);
  logger.info(`  PUT    /api/settings`);
  logger.info(`  GET    /api/logs/dm`);
  logger.info(`  GET    /api/logs/system`);
  logger.info(`  GET    /api/logs/comments`);
  logger.info(`  GET    /api/status`);
  logger.info(`  GET    /api/health\n`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down gracefully...');

  const { closeDatabase } = await import('./database/db.js');
  const { getInstagramService } = await import('./services/instagram.service.js');

  try {
    // Close Instagram browser
    const instagramService = getInstagramService();
    await instagramService.close();

    // Close database
    closeDatabase();

    logger.info('✅ Shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', error.message);
    process.exit(1);
  }
});
