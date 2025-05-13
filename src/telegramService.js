const TelegramBot = require('node-telegram-bot-api');

const LOG_CHANNEL_ID = '-1002298860617';
const KILZI_CHAT_ID = '454873194';
const DORSE_CHAT_ID = '673447790';

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

  async notifySimulationChange(oldName, newName) {
    const baseMessage = `🔄 *Simulation Changed*
From: ${oldName}
To: ${newName}`;
    const userMessage = `${baseMessage}

💡 Tip: Run /get\\_current\\_simulation to show the current simulation data and name.`;

    // Send to log channel
    await this.sendMessage(baseMessage, LOG_CHANNEL_ID);

    // Send to users with additional command info
    const userTargets = [KILZI_CHAT_ID, DORSE_CHAT_ID];
    await Promise.all(
      userTargets.map((id) => this.sendMessage(userMessage, id)),
    );
  }

  async notifyError(error) {
    const message = `❌ Error Occurred
${error.message}`;
    await this.sendMessage(message);
  }
}

module.exports = new TelegramService();
