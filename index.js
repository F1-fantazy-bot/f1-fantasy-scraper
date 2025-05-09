require('dotenv').config();

const {
  fetchBestTeamsDataFromF1FantasyTools,
} = require('./src/fetchBestTeamsDataFromF1FantasyTools');
const { uploadDataToAzureStorage } = require('./src/uploadDataToAzureStorage');
const telegramService = require('./src/telegramService');

(async () => {
  try {
    const data = await fetchBestTeamsDataFromF1FantasyTools();
    console.log('Fetched data:', data);

    if (!data || !data.drivers || !data.constructors) {
      throw new Error('Invalid or missing data structure');
    }

    await uploadDataToAzureStorage(data);
  } catch (error) {
    const errorMessage = error.stack || error.message;
    console.error('Error:', errorMessage);

    try {
      await telegramService.notifyError(error);
    } catch (telegramError) {
      console.error(
        'Failed to send error notification:',
        telegramError.message,
      );
    }

    process.exit(1);
  }
})();
