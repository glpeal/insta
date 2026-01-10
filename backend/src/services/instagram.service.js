import puppeteer from 'puppeteer';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';
import { sleep, typeWithDelay } from '../utils/delay.js';
import { encrypt, decrypt } from '../utils/encryption.js';
import { dbHelpers } from '../database/db.js';
import fs from 'fs';
import path from 'path';

/**
 * Instagram automation service using Puppeteer
 * Handles authentication, comment tracking, and DM sending
 */
class InstagramService {
  constructor() {
    this.browser = null;
    this.page = null;
    this.isLoggedIn = false;
    this.currentAccount = null;
  }

  /**
   * Initialize browser instance
   */
  async initBrowser() {
    if (this.browser) {
      return this.browser;
    }

    logger.info('Initializing browser...');

    try {
      this.browser = await puppeteer.launch({
        headless: config.browser.headless,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-blink-features=AutomationControlled',
          '--disable-features=IsolateOrigins,site-per-process'
        ],
        userDataDir: config.browser.dataDir
      });

      this.page = await this.browser.newPage();

      // Set realistic viewport
      await this.page.setViewport({ width: 1366, height: 768 });

      // Set user agent to avoid detection
      await this.page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      // Block unnecessary resources to speed up loading
      await this.page.setRequestInterception(true);
      this.page.on('request', (request) => {
        const resourceType = request.resourceType();
        if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
          request.abort();
        } else {
          request.continue();
        }
      });

      logger.info('Browser initialized successfully');
      return this.browser;
    } catch (error) {
      logger.error('Failed to initialize browser', error.message);
      throw error;
    }
  }

  /**
   * Login to Instagram with username and password
   */
  async login(username, password) {
    try {
      await this.initBrowser();

      logger.info(`Attempting to login as ${username}...`);

      await this.page.goto('https://www.instagram.com/accounts/login/', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      await sleep(2000);

      // Wait for login form
      await this.page.waitForSelector('input[name="username"]', { timeout: 10000 });

      // Type username with human-like delays
      const usernameInput = await this.page.$('input[name="username"]');
      await typeWithDelay(usernameInput, username, 100, 200);

      await sleep(500);

      // Type password
      const passwordInput = await this.page.$('input[name="password"]');
      await typeWithDelay(passwordInput, password, 100, 200);

      await sleep(1000);

      // Click login button
      await this.page.click('button[type="submit"]');

      // Wait for navigation
      await sleep(5000);

      // Check if login was successful
      const currentUrl = this.page.url();

      if (currentUrl.includes('/challenge/')) {
        logger.warning('2FA or security check required');
        return {
          success: false,
          requiresVerification: true,
          message: 'Требуется подтверждение безопасности или 2FA. Пожалуйста, пройдите проверку вручную.'
        };
      }

      if (currentUrl.includes('/accounts/login/')) {
        logger.error('Login failed - still on login page');
        return {
          success: false,
          message: 'Неверные учетные данные или Instagram заблокировал вход.'
        };
      }

      // Save cookies
      const cookies = await this.page.cookies();
      const cookiesJson = JSON.stringify(cookies);
      const encryptedCookies = encrypt(cookiesJson);

      // Save to database
      let account = dbHelpers.getAccount(username);
      if (!account) {
        dbHelpers.createAccount(username);
        account = dbHelpers.getAccount(username);
      }

      dbHelpers.updateAccountCookies(username, encryptedCookies);

      // Create default settings if not exist
      if (!dbHelpers.getSettings(account.id)) {
        dbHelpers.createDefaultSettings(account.id);
      }

      this.isLoggedIn = true;
      this.currentAccount = account;

      logger.info(`Successfully logged in as ${username}`);

      return {
        success: true,
        message: 'Успешный вход',
        accountId: account.id
      };

    } catch (error) {
      logger.error('Login error', error.message);
      return {
        success: false,
        message: `Ошибка входа: ${error.message}`
      };
    }
  }

  /**
   * Restore session from saved cookies
   */
  async restoreSession(username) {
    try {
      await this.initBrowser();

      const account = dbHelpers.getAccount(username);
      if (!account || !account.encrypted_cookies) {
        logger.warning(`No saved session for ${username}`);
        return { success: false, message: 'Нет сохраненной сессии' };
      }

      logger.info(`Restoring session for ${username}...`);

      // Decrypt and restore cookies
      const cookiesJson = decrypt(account.encrypted_cookies);
      const cookies = JSON.parse(cookiesJson);

      await this.page.setCookie(...cookies);

      // Navigate to Instagram
      await this.page.goto('https://www.instagram.com/', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      await sleep(3000);

      // Check if session is valid
      const currentUrl = this.page.url();
      if (currentUrl.includes('/accounts/login/')) {
        logger.warning('Session expired');
        return { success: false, message: 'Сессия истекла, требуется повторный вход' };
      }

      this.isLoggedIn = true;
      this.currentAccount = account;

      logger.info(`Session restored for ${username}`);

      return { success: true, message: 'Сессия восстановлена' };

    } catch (error) {
      logger.error('Session restoration error', error.message);
      return { success: false, message: `Ошибка восстановления сессии: ${error.message}` };
    }
  }

  /**
   * Check if current session is valid
   */
  async checkSession() {
    if (!this.page || !this.isLoggedIn) {
      return false;
    }

    try {
      const currentUrl = this.page.url();
      if (!currentUrl.includes('instagram.com')) {
        await this.page.goto('https://www.instagram.com/', { waitUntil: 'networkidle2' });
      }

      await sleep(2000);

      const url = this.page.url();
      return !url.includes('/accounts/login/');
    } catch (error) {
      logger.error('Session check error', error.message);
      return false;
    }
  }

  /**
   * Get recent posts from profile
   */
  async getRecentPosts(username, limit = 10) {
    try {
      if (!this.isLoggedIn) {
        throw new Error('Not logged in');
      }

      logger.info(`Fetching recent posts for @${username}...`);

      await this.page.goto(`https://www.instagram.com/${username}/`, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      await sleep(2000);

      // Extract post URLs
      const posts = await this.page.evaluate((limit) => {
        const postLinks = Array.from(document.querySelectorAll('article a[href*="/p/"], article a[href*="/reel/"]'));
        return postLinks
          .slice(0, limit)
          .map(link => link.href)
          .filter((url, index, self) => self.indexOf(url) === index);
      }, limit);

      logger.info(`Found ${posts.length} posts`);
      return posts;

    } catch (error) {
      logger.error('Error fetching posts', error.message);
      throw error;
    }
  }

  /**
   * Get comments from a specific post
   */
  async getCommentsFromPost(postUrl) {
    try {
      logger.info(`Fetching comments from ${postUrl}...`);

      await this.page.goto(postUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      await sleep(3000);

      // Scroll to load more comments
      await this.page.evaluate(async () => {
        const commentsSection = document.querySelector('ul[class*="comment"]');
        if (commentsSection) {
          commentsSection.scrollIntoView();
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      });

      await sleep(2000);

      // Extract comments
      const comments = await this.page.evaluate(() => {
        const commentElements = Array.from(document.querySelectorAll('ul li[role="menuitem"]'));

        return commentElements.map((element, index) => {
          const usernameElement = element.querySelector('a[href^="/"]');
          const textElement = element.querySelector('span');

          return {
            id: `comment_${Date.now()}_${index}`,
            username: usernameElement ? usernameElement.innerText : null,
            text: textElement ? textElement.innerText : null,
            profileUrl: usernameElement ? usernameElement.href : null
          };
        }).filter(comment => comment.username && comment.text);
      });

      logger.info(`Found ${comments.length} comments`);
      return comments;

    } catch (error) {
      logger.error('Error fetching comments', error.message);
      return [];
    }
  }

  /**
   * Send DM to a user
   */
  async sendDirectMessage(username, message) {
    try {
      if (!this.isLoggedIn) {
        throw new Error('Not logged in');
      }

      logger.info(`Sending DM to @${username}...`);

      // Navigate to DM page
      await this.page.goto('https://www.instagram.com/direct/inbox/', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      await sleep(2000);

      // Click "Send message" button
      const newMessageButton = await this.page.$('a[href="/direct/new/"]');
      if (newMessageButton) {
        await newMessageButton.click();
        await sleep(2000);
      }

      // Search for user
      const searchInput = await this.page.$('input[placeholder*="Search"], input[name="queryBox"]');
      if (!searchInput) {
        throw new Error('Could not find search input');
      }

      await searchInput.click();
      await sleep(500);
      await typeWithDelay(searchInput, username, 100, 200);
      await sleep(2000);

      // Click on the user from search results
      const userResult = await this.page.$(`div[role="button"]:has-text("${username}")`);
      if (!userResult) {
        // Try alternative selector
        await this.page.click('div[role="button"]');
      } else {
        await userResult.click();
      }

      await sleep(1000);

      // Click "Next" or "Chat" button
      const nextButton = await this.page.$('button:has-text("Next"), button:has-text("Chat"), div[role="button"]:has-text("Next")');
      if (nextButton) {
        await nextButton.click();
        await sleep(2000);
      }

      // Type message
      const messageInput = await this.page.$('textarea[placeholder*="Message"], div[contenteditable="true"]');
      if (!messageInput) {
        throw new Error('Could not find message input');
      }

      await messageInput.click();
      await sleep(500);
      await typeWithDelay(messageInput, message, 80, 150);
      await sleep(1000);

      // Send message
      await this.page.keyboard.press('Enter');
      await sleep(2000);

      logger.info(`DM sent successfully to @${username}`);

      return { success: true };

    } catch (error) {
      logger.error(`Failed to send DM to @${username}`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Close browser
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
      this.isLoggedIn = false;
      logger.info('Browser closed');
    }
  }
}

// Singleton instance
let instagramServiceInstance = null;

export const getInstagramService = () => {
  if (!instagramServiceInstance) {
    instagramServiceInstance = new InstagramService();
  }
  return instagramServiceInstance;
};

export default InstagramService;
