const {
  fetchBestTeamsDataFromF1FantasyTools,
} = require('./fetchBestTeamsDataFromF1FantasyTools');

(async () => {
  try {
    const data = await fetchBestTeamsDataFromF1FantasyTools();
    console.log('Fetched data:', data);
  } catch (error) {
    console.error('Error:', error);
  }
})();
