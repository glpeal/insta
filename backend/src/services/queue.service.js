import { logger } from '../utils/logger.js';
import { getRandomDelay, sleep } from '../utils/delay.js';
import { dbHelpers } from '../database/db.js';
import { getInstagramService } from './instagram.service.js';

/**
 * Simple in-memory queue service for DM sending
 * Can be replaced with BullMQ + Redis for production scalability
 */
class QueueService {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
    this.isPaused = false;
    this.currentAccountId = null;
    this.sentThisHour = 0;
    this.lastHourReset = Date.now();
  }

  /**
   * Add DM task to queue
   */
  addTask(task) {
    const existingTask = this.queue.find(
      t => t.recipientUsername === task.recipientUsername && t.accountId === task.accountId
    );

    if (existingTask) {
      logger.warning(`Task for @${task.recipientUsername} already in queue, skipping`);
      return false;
    }

    this.queue.push({
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...task,
      status: 'pending',
      retries: 0,
      maxRetries: 3,
      addedAt: new Date()
    });

    logger.info(`Task added to queue: DM to @${task.recipientUsername}`);

    // Start processing if not already running
    if (!this.isProcessing) {
      this.processQueue();
    }

    return true;
  }

  /**
   * Pause queue processing
   */
  pause() {
    this.isPaused = true;
    logger.info('Queue paused');
  }

  /**
   * Resume queue processing
   */
  resume() {
    this.isPaused = false;
    logger.info('Queue resumed');

    if (!this.isProcessing && this.queue.length > 0) {
      this.processQueue();
    }
  }

  /**
   * Get queue status
   */
  getStatus() {
    return {
      queueLength: this.queue.length,
      isProcessing: this.isProcessing,
      isPaused: this.isPaused,
      sentThisHour: this.sentThisHour,
      pendingTasks: this.queue.filter(t => t.status === 'pending').length,
      failedTasks: this.queue.filter(t => t.status === 'failed').length
    };
  }

  /**
   * Clear queue
   */
  clear() {
    this.queue = [];
    logger.info('Queue cleared');
  }

  /**
   * Reset hourly counter
   */
  resetHourlyCounter() {
    const now = Date.now();
    const hourInMs = 60 * 60 * 1000;

    if (now - this.lastHourReset >= hourInMs) {
      this.sentThisHour = 0;
      this.lastHourReset = now;
      logger.info('Hourly DM counter reset');
    }
  }

  /**
   * Check if rate limit is reached
   */
  isRateLimited(maxPerHour) {
    this.resetHourlyCounter();
    return this.sentThisHour >= maxPerHour;
  }

  /**
   * Process queue
   */
  async processQueue() {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    logger.info('Queue processing started');

    while (this.queue.length > 0) {
      // Check if paused
      if (this.isPaused) {
        logger.info('Queue is paused, waiting...');
        await sleep(5000);
        continue;
      }

      // Get next pending task
      const task = this.queue.find(t => t.status === 'pending');

      if (!task) {
        // No more pending tasks, but queue might have failed tasks
        break;
      }

      try {
        // Get settings for account
        const settings = dbHelpers.getSettings(task.accountId);
        if (!settings) {
          logger.error(`No settings found for account ${task.accountId}`);
          task.status = 'failed';
          task.error = 'No settings found';
          continue;
        }

        // Check if automation is enabled
        if (!settings.automation_enabled) {
          logger.info('Automation is disabled, pausing queue');
          this.pause();
          break;
        }

        // Check rate limit
        if (this.isRateLimited(settings.max_dm_per_hour)) {
          const waitTime = 60 - Math.floor((Date.now() - this.lastHourReset) / (60 * 1000));
          logger.warning(`Rate limit reached (${settings.max_dm_per_hour}/hour). Waiting ${waitTime} minutes...`);
          await sleep(60000); // Wait 1 minute and check again
          continue;
        }

        // Process task
        logger.info(`Processing task: ${task.id} - DM to @${task.recipientUsername}`);

        task.status = 'processing';

        // Create DM log entry
        const logResult = dbHelpers.addDmLog(
          task.accountId,
          task.recipientUsername,
          task.message,
          'pending'
        );

        const logId = logResult.lastInsertRowid;

        // Send DM
        const instagramService = getInstagramService();
        const result = await instagramService.sendDirectMessage(
          task.recipientUsername,
          task.message
        );

        if (result.success) {
          // Success
          task.status = 'completed';
          this.sentThisHour++;

          // Update DM log
          dbHelpers.updateDmLogStatus(logId, 'sent', null);

          // Mark comment as processed if commentId is provided
          if (task.commentId) {
            dbHelpers.markCommentProcessed(task.commentId);
          }

          logger.info(`✅ DM sent successfully to @${task.recipientUsername}`);

          // Remove from queue
          this.queue = this.queue.filter(t => t.id !== task.id);

        } else {
          // Failed
          task.retries++;

          if (task.retries >= task.maxRetries) {
            task.status = 'failed';
            task.error = result.error;

            dbHelpers.updateDmLogStatus(logId, 'failed', result.error);

            logger.error(`❌ Failed to send DM to @${task.recipientUsername} after ${task.retries} retries: ${result.error}`);

            // Remove from queue
            this.queue = this.queue.filter(t => t.id !== task.id);

          } else {
            task.status = 'pending';

            dbHelpers.updateDmLogStatus(logId, 'retry', `Attempt ${task.retries}: ${result.error}`);

            logger.warning(`⚠️ Retry ${task.retries}/${task.maxRetries} for @${task.recipientUsername}: ${result.error}`);
          }
        }

        // Random delay between messages
        const delayMs = getRandomDelay(settings.min_delay_seconds, settings.max_delay_seconds);
        logger.info(`Waiting ${Math.floor(delayMs / 1000)} seconds before next message...`);
        await sleep(delayMs);

      } catch (error) {
        logger.error(`Error processing task ${task.id}`, error.message);
        task.status = 'failed';
        task.error = error.message;

        // Remove from queue
        this.queue = this.queue.filter(t => t.id !== task.id);
      }
    }

    this.isProcessing = false;
    logger.info('Queue processing finished');
  }
}

// Singleton instance
let queueServiceInstance = null;

export const getQueueService = () => {
  if (!queueServiceInstance) {
    queueServiceInstance = new QueueService();
  }
  return queueServiceInstance;
};

export default QueueService;
