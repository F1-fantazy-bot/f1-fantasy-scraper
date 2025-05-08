require('dotenv').config();

const {
  fetchBestTeamsDataFromF1FantasyTools,
} = require('./src/fetchBestTeamsDataFromF1FantasyTools');
const { uploadDataToAzureStorage } = require('./src/uploadDataToAzureStorage');

(async () => {
  try {
    const data = await fetchBestTeamsDataFromF1FantasyTools();
    console.log('Fetched data:', data);

    if (!data || !data.drivers || !data.constructors) {
      throw new Error('Invalid or missing data structure');
    }

    await uploadDataToAzureStorage(data);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
