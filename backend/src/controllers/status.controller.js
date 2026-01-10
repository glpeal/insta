import { getInstagramService } from '../services/instagram.service.js';
import { getQueueService } from '../services/queue.service.js';
import { getCommentTrackerService } from '../services/comment-tracker.service.js';
import { logger } from '../utils/logger.js';

/**
 * System status endpoints
 */

export const getStatusController = async (req, res) => {
  try {
    const instagramService = getInstagramService();
    const queueService = getQueueService();
    const trackerService = getCommentTrackerService();

    const isLoggedIn = instagramService.isLoggedIn;
    const queueStatus = queueService.getStatus();
    const trackerStatus = trackerService.getStatus();

    return res.json({
      success: true,
      status: {
        instagram: {
          isLoggedIn,
          account: instagramService.currentAccount
            ? {
                id: instagramService.currentAccount.id,
                username: instagramService.currentAccount.username,
                lastLogin: instagramService.currentAccount.last_login_at
              }
            : null
        },
        queue: queueStatus,
        tracker: trackerStatus
      }
    });

  } catch (error) {
    logger.error('Get status controller error', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const healthCheckController = async (req, res) => {
  return res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
};
