import { dbHelpers } from '../database/db.js';
import { getInstagramService } from '../services/instagram.service.js';
import { logger } from '../utils/logger.js';

/**
 * Logs and history endpoints
 */

export const getDmLogsController = async (req, res) => {
  try {
    const instagramService = getInstagramService();

    if (!instagramService.currentAccount) {
      return res.status(401).json({
        success: false,
        message: 'Not logged in'
      });
    }

    const limit = parseInt(req.query.limit) || 100;
    const logs = dbHelpers.getRecentDmLogs(instagramService.currentAccount.id, limit);

    return res.json({
      success: true,
      logs
    });

  } catch (error) {
    logger.error('Get DM logs controller error', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getSystemLogsController = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const logs = dbHelpers.getRecentSystemLogs(limit);

    return res.json({
      success: true,
      logs
    });

  } catch (error) {
    logger.error('Get system logs controller error', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getTrackedCommentsController = async (req, res) => {
  try {
    const instagramService = getInstagramService();

    if (!instagramService.currentAccount) {
      return res.status(401).json({
        success: false,
        message: 'Not logged in'
      });
    }

    const { getDb } = await import('../database/db.js');
    const db = getDb();

    const comments = db.prepare(`
      SELECT * FROM tracked_comments
      WHERE account_id = ?
      ORDER BY detected_at DESC
      LIMIT 100
    `).all(instagramService.currentAccount.id);

    return res.json({
      success: true,
      comments
    });

  } catch (error) {
    logger.error('Get tracked comments controller error', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
