// index.js: Calls fetchBestTeamsDataFromF1FantasyTools from fetchJson.js

const { fetchBestTeamsDataFromF1FantasyTools } = require('./fetchJson');

(async () => {
  try {
    const data = await fetchBestTeamsDataFromF1FantasyTools();
    console.log('Fetched data:', data);
  } catch (error) {
    console.error('Error:', error);
  }
})();
