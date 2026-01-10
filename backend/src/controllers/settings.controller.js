import { dbHelpers } from '../database/db.js';
import { getInstagramService } from '../services/instagram.service.js';
import { getQueueService } from '../services/queue.service.js';
import { logger } from '../utils/logger.js';

/**
 * Settings management endpoints
 */

export const getSettingsController = async (req, res) => {
  try {
    const instagramService = getInstagramService();

    if (!instagramService.currentAccount) {
      return res.status(401).json({
        success: false,
        message: 'Not logged in'
      });
    }

    const settings = dbHelpers.getSettings(instagramService.currentAccount.id);

    if (!settings) {
      return res.status(404).json({
        success: false,
        message: 'Settings not found'
      });
    }

    return res.json({
      success: true,
      settings: {
        ...settings,
        automation_enabled: Boolean(settings.automation_enabled)
      }
    });

  } catch (error) {
    logger.error('Get settings controller error', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const updateSettingsController = async (req, res) => {
  try {
    const instagramService = getInstagramService();

    if (!instagramService.currentAccount) {
      return res.status(401).json({
        success: false,
        message: 'Not logged in'
      });
    }

    const {
      automation_enabled,
      dm_template,
      max_dm_per_hour,
      min_delay_seconds,
      max_delay_seconds
    } = req.body;

    const updatedSettings = {};

    if (automation_enabled !== undefined) {
      updatedSettings.automation_enabled = automation_enabled;

      // Update queue state
      const queueService = getQueueService();
      if (automation_enabled) {
        queueService.resume();
      } else {
        queueService.pause();
      }
    }

    if (dm_template !== undefined) {
      updatedSettings.dm_template = dm_template;
    }

    if (max_dm_per_hour !== undefined) {
      updatedSettings.max_dm_per_hour = max_dm_per_hour;
    }

    if (min_delay_seconds !== undefined) {
      updatedSettings.min_delay_seconds = min_delay_seconds;
    }

    if (max_delay_seconds !== undefined) {
      updatedSettings.max_delay_seconds = max_delay_seconds;
    }

    dbHelpers.updateSettings(instagramService.currentAccount.id, updatedSettings);

    const settings = dbHelpers.getSettings(instagramService.currentAccount.id);

    logger.info('Settings updated successfully');

    return res.json({
      success: true,
      message: 'Settings updated',
      settings: {
        ...settings,
        automation_enabled: Boolean(settings.automation_enabled)
      }
    });

  } catch (error) {
    logger.error('Update settings controller error', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
