const TelegramBot = require('node-telegram-bot-api');
const { listAllUserChatIds } = require('./userRegistryService');

const LOG_CHANNEL_ID = '-1002298860617';

class TelegramService {
  constructor() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      throw new Error('TELEGRAM_BOT_TOKEN environment variable is not set');
    }
    this.bot = new TelegramBot(token);
  }

  async sendMessage(message, chatId = LOG_CHANNEL_ID) {
    try {
      const formattedMessage =
        chatId === LOG_CHANNEL_ID ? `SCRAPER: ${message}` : message;
      await this.bot.sendMessage(chatId, formattedMessage, {
        parse_mode: 'Markdown',
      });
      console.log('Telegram notification sent successfully');
    } catch (error) {
      console.error('Failed to send Telegram notification:', error.message);
      // Don't throw - we don't want telegram errors to crash the main process
    }
  }

  formatTimestamp(utcTimestamp) {
    if (!utcTimestamp) {
      return 'Unknown';
    }

    try {
      const date = new Date(utcTimestamp);
      // Format to Israel timezone (Asia/Jerusalem)
      return date.toLocaleString('en-GB', {
        timeZone: 'Asia/Jerusalem',
        timeZoneName: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      console.warn('Failed to format timestamp:', error);
      return utcTimestamp;
    }
  }

  async notifySimulationChange(oldData, newData) {
    const nameChanged = oldData?.SimulationName !== newData.SimulationName;
    const timeChanged =
      oldData?.SimulationLastUpdate !== newData.SimulationLastUpdate;

    let baseMessage = '';

    if (nameChanged && timeChanged) {
      baseMessage = `🔄 *Simulation Changed*
From: ${oldData?.SimulationName || 'None'}
To: ${newData.SimulationName}
⏰ Updated: ${this.formatTimestamp(newData.SimulationLastUpdate)}`;
    } else if (nameChanged) {
      baseMessage = `🔄 *Simulation Changed*
From: ${oldData?.SimulationName || 'None'}
To: ${newData.SimulationName}`;
    } else if (timeChanged) {
      baseMessage = `⏰ *Simulation Updated*
Name: ${newData.SimulationName}
From: ${this.formatTimestamp(oldData?.SimulationLastUpdate)}
To: ${this.formatTimestamp(newData.SimulationLastUpdate)}`;
    }

    const userMessage = `${baseMessage}

💡 Tip: Run /get\\_current\\_simulation to show the current simulation data and name.`;

    // Send to log channel
    await this.sendMessage(baseMessage, LOG_CHANNEL_ID);

    // Send to all registered users from Azure Table Storage
    try {
      const userChatIds = await listAllUserChatIds();
      const results = await Promise.allSettled(
        userChatIds.map((id) => this.sendMessage(userMessage, id)),
      );

      const failures = results.filter((r) => r.status === 'rejected');
      if (failures.length > 0) {
        console.error(
          `Failed to send notification to ${failures.length} user(s):`,
          failures.map((f) => f.reason?.message || f.reason),
        );
      }
    } catch (error) {
      console.error(
        'Failed to fetch registered users, skipping user notifications:',
        error.message,
      );
    }
  }

  async notifyError(error) {
    const message = `❌ Error Occurred
${error.message}`;
    await this.sendMessage(message);
  }
}

module.exports = new TelegramService();
