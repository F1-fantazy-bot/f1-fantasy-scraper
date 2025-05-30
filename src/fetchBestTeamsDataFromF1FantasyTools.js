const puppeteer = require('puppeteer');

exports.fetchBestTeamsDataFromF1FantasyTools = async function () {
  try {
    const data = await fetchData();
    console.log('Fetched data:', data);
    return data;
  } catch (error) {
    console.error(`Error fetching data: ${error.message}`);
    throw error;
  }
};

async function fetchData() {
  const url = 'https://f1fantasytools.com/team-calculator';
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--enable-features=NetworkService,NetworkServiceInProcess',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
    ],
  });

  try {
    const page = await browser.newPage();

    // Disable images and CSS to reduce memory usage
    await page.setRequestInterception(true);
    page.on('request', (r) => {
      if (['image', 'font', 'stylesheet'].includes(r.resourceType())) r.abort();
      else r.continue();
    });

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });

    // ── wait for heading text “Drivers” to show up ──
    await page.waitForSelector('h3', {
      timeout: 15_000,
      visible: true,
    });

    // ── Run JS inside the page to scrape rows ──
    const result = await page.evaluate(() => {
      // helper function to grab table rows following a given <h3>
      function scrapeTable(headingText) {
        // eslint-disable-next-line no-undef
        const h3 = [...document.querySelectorAll('h3')].find(
          (h) => h.textContent.trim() === headingText,
        );
        if (!h3) {
          return [];
        }
        const table =
          h3.nextElementSibling?.querySelector('table') ||
          h3.parentElement?.querySelector('table');
        if (!table) {
          return [];
        }

        const out = [];
        table.querySelectorAll('tbody tr').forEach((tr) => {
          const tds = tr.querySelectorAll('td');
          if (tds.length < 3) {
            return;
          }
          const code = tds[0].textContent.trim();
          if (!/^[A-Z]{2,4}$/.test(code)) {
            return;
          }

          const price = parseFloat(tds[1].textContent);
          const delta = parseFloat(tds[2].textContent);

          // xPts lives further right, often inside an input
          let pts;
          tds.forEach((td, idx) => {
            if (idx < 3 || pts !== undefined) {
              return;
            }
            const inp = td.querySelector('input[value]');
            const raw =
              inp?.value || td.textContent.match(/-?\d+(?:\.\d+)?/)?.[0];
            if (raw) {
              pts = parseFloat(raw);
            }
          });
          if (pts !== undefined) {
            out.push({
              [headingText === 'Drivers' ? 'DR' : 'CN']: code,
              price,
              expectedPriceChange: delta,
              expectedPoints: pts,
            });
          }
        });

        return out;
      }

      function scrapeSimulationName() {
        // eslint-disable-next-line no-undef
        const label = [...document.querySelectorAll('label')].find(
          (l) => l.textContent.trim() === 'Select a simulation preset',
        );
        if (!label) {
          return 'unknown - cant find relevant label';
        }

        return (
          label.nextElementSibling?.querySelectorAll('span')[1]?.textContent ||
          'unknown - cant find relevant span'
        );
      }

      return {
        Drivers: scrapeTable('Drivers'),
        Constructors: scrapeTable('Constructors'),
        SimulationName: scrapeSimulationName(),
      };
    });

    await page.close();
    await browser.close();
    console.log(JSON.stringify(result, null, 2));

    return result;
  } catch (error) {
    await browser.close();
    throw new Error(`Failed to fetch data: ${error.message}`);
  }
}
