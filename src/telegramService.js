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
      await this.bot.sendMessage(chatId, message);
      console.log('Telegram notification sent successfully');
    } catch (error) {
      console.error('Failed to send Telegram notification:', error.message);
      // Don't throw - we don't want telegram errors to crash the main process
    }
  }

  async notifySimulationChange(oldName, newName) {
    const message = `🔄 Simulation Changed\nFrom: ${oldName}\nTo: ${newName}`;
    const targets = [LOG_CHANNEL_ID, KILZI_CHAT_ID, DORSE_CHAT_ID];
    await Promise.all(targets.map((id) => this.sendMessage(message, id)));
  }

  async notifyError(error) {
    const message = `❌ Error Occurred\n${error.message}`;
    await this.sendMessage(message);
  }
}

module.exports = new TelegramService();
