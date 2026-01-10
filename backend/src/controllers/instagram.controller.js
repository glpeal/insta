import { getInstagramService } from '../services/instagram.service.js';
import { getCommentTrackerService } from '../services/comment-tracker.service.js';
import { logger } from '../utils/logger.js';

/**
 * Instagram-related API endpoints
 */

export const loginController = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    const instagramService = getInstagramService();
    const result = await instagramService.login(username, password);

    if (result.success) {
      // Start comment tracking
      const trackerService = getCommentTrackerService();
      await trackerService.startTracking(result.accountId, username);

      return res.json(result);
    }

    return res.status(401).json(result);

  } catch (error) {
    logger.error('Login controller error', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const restoreSessionController = async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({
        success: false,
        message: 'Username is required'
      });
    }

    const instagramService = getInstagramService();
    const result = await instagramService.restoreSession(username);

    if (result.success) {
      // Start comment tracking
      const trackerService = getCommentTrackerService();
      const account = instagramService.currentAccount;
      await trackerService.startTracking(account.id, username);
    }

    return res.json(result);

  } catch (error) {
    logger.error('Restore session controller error', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const checkSessionController = async (req, res) => {
  try {
    const instagramService = getInstagramService();
    const isValid = await instagramService.checkSession();

    return res.json({
      success: true,
      isLoggedIn: isValid,
      account: instagramService.currentAccount
    });

  } catch (error) {
    logger.error('Check session controller error', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const logoutController = async (req, res) => {
  try {
    const instagramService = getInstagramService();
    const trackerService = getCommentTrackerService();

    // Stop tracking
    trackerService.stopTracking();

    // Close browser
    await instagramService.close();

    return res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    logger.error('Logout controller error', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const sendTestDmController = async (req, res) => {
  try {
    const { username, message } = req.body;

    if (!username || !message) {
      return res.status(400).json({
        success: false,
        message: 'Username and message are required'
      });
    }

    const instagramService = getInstagramService();

    if (!instagramService.isLoggedIn) {
      return res.status(401).json({
        success: false,
        message: 'Not logged in'
      });
    }

    const result = await instagramService.sendDirectMessage(username, message);

    return res.json(result);

  } catch (error) {
    logger.error('Send test DM controller error', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
