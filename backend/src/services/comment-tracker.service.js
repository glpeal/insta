import { logger } from '../utils/logger.js';
import { sleep } from '../utils/delay.js';
import { dbHelpers } from '../database/db.js';
import { getInstagramService } from './instagram.service.js';
import { getQueueService } from './queue.service.js';

/**
 * Comment tracking service
 * Monitors posts for new comments and triggers DM sending
 */
class CommentTrackerService {
  constructor() {
    this.isTracking = false;
    this.trackingInterval = null;
    this.checkIntervalSeconds = 60; // Check every 60 seconds
    this.postsToTrack = [];
  }

  /**
   * Start tracking comments
   */
  async startTracking(accountId, username) {
    if (this.isTracking) {
      logger.warning('Comment tracking already running');
      return { success: false, message: 'Tracking already running' };
    }

    try {
      logger.info(`Starting comment tracking for @${username}...`);

      this.isTracking = true;

      // Get recent posts to track
      const instagramService = getInstagramService();
      const posts = await instagramService.getRecentPosts(username, 5); // Track last 5 posts

      if (!posts || posts.length === 0) {
        logger.warning('No posts found to track');
        return { success: false, message: 'No posts found' };
      }

      this.postsToTrack = posts;
      logger.info(`Tracking ${posts.length} posts for new comments`);

      // Start periodic checking
      this.trackingInterval = setInterval(async () => {
        await this.checkForNewComments(accountId);
      }, this.checkIntervalSeconds * 1000);

      // Run first check immediately
      await this.checkForNewComments(accountId);

      return { success: true, message: `Tracking ${posts.length} posts` };

    } catch (error) {
      logger.error('Failed to start tracking', error.message);
      this.isTracking = false;
      return { success: false, message: error.message };
    }
  }

  /**
   * Stop tracking comments
   */
  stopTracking() {
    if (!this.isTracking) {
      logger.warning('Comment tracking not running');
      return { success: false, message: 'Tracking not running' };
    }

    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
    }

    this.isTracking = false;
    this.postsToTrack = [];

    logger.info('Comment tracking stopped');

    return { success: true, message: 'Tracking stopped' };
  }

  /**
   * Check for new comments on tracked posts
   */
  async checkForNewComments(accountId) {
    if (!this.isTracking) {
      return;
    }

    try {
      logger.info('Checking for new comments...');

      const instagramService = getInstagramService();
      const queueService = getQueueService();

      // Get settings
      const settings = dbHelpers.getSettings(accountId);
      if (!settings || !settings.automation_enabled) {
        logger.info('Automation disabled, skipping check');
        return;
      }

      let newCommentsCount = 0;

      // Check each post
      for (const postUrl of this.postsToTrack) {
        try {
          const comments = await instagramService.getCommentsFromPost(postUrl);

          for (const comment of comments) {
            // Generate unique comment ID
            const commentId = `${postUrl}_${comment.username}_${Date.now()}`;

            // Try to add to database (will skip if already exists)
            const result = dbHelpers.addTrackedComment(
              accountId,
              commentId,
              postUrl,
              comment.username,
              comment.text
            );

            if (result) {
              newCommentsCount++;
              logger.info(`📝 New comment from @${comment.username}: ${comment.text.substring(0, 50)}...`);

              // Add to DM queue
              const taskAdded = queueService.addTask({
                accountId,
                recipientUsername: comment.username,
                message: settings.dm_template,
                commentId,
                postUrl
              });

              if (taskAdded) {
                logger.info(`✉️ Added DM task for @${comment.username}`);
              }
            }
          }

          // Small delay between posts
          await sleep(2000);

        } catch (error) {
          logger.error(`Error checking post ${postUrl}`, error.message);
        }
      }

      if (newCommentsCount > 0) {
        logger.info(`✅ Found ${newCommentsCount} new comments`);
      } else {
        logger.info('No new comments found');
      }

    } catch (error) {
      logger.error('Error checking for new comments', error.message);
    }
  }

  /**
   * Update posts to track
   */
  async updateTrackedPosts(username, postUrls) {
    this.postsToTrack = postUrls;
    logger.info(`Updated tracked posts: ${postUrls.length} posts`);
  }

  /**
   * Get tracking status
   */
  getStatus() {
    return {
      isTracking: this.isTracking,
      postsCount: this.postsToTrack.length,
      checkIntervalSeconds: this.checkIntervalSeconds
    };
  }
}

// Singleton instance
let commentTrackerInstance = null;

export const getCommentTrackerService = () => {
  if (!commentTrackerInstance) {
    commentTrackerInstance = new CommentTrackerService();
  }
  return commentTrackerInstance;
};

export default CommentTrackerService;
