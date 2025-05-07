require('dotenv').config();

const {
  fetchBestTeamsDataFromF1FantasyTools,
} = require('./src/fetchBestTeamsDataFromF1FantasyTools');
const { uploadToAzureStorage } = require('./src/azureStorage');

(async () => {
  try {
    const data = await fetchBestTeamsDataFromF1FantasyTools();
    console.log('Fetched data:', data);

    if (!data || !data.drivers || !data.constructors) {
      throw new Error('Invalid or missing data structure');
    }

    await uploadToAzureStorage(data);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
