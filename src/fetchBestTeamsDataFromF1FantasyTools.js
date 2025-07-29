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
      // Network optimization - runs network service in the main process
      '--enable-features=NetworkService,NetworkServiceInProcess',

      // Security - disables Chrome's sandboxing (required in containers)
      '--no-sandbox',

      // Security - disables setuid sandbox (required for non-root containers)
      '--disable-setuid-sandbox',

      // Memory - uses /tmp instead of /dev/shm for shared memory (prevents OOM in containers)
      '--disable-dev-shm-usage',

      // Performance - prevents Chrome from throttling due to memory pressure
      '--memory-pressure-off',

      // Performance - prevents background tabs from being throttled (keeps navigation active)
      '--disable-background-timer-throttling',

      // Performance - keeps renderer process active (prevents backgrounding delays)
      '--disable-renderer-backgrounding',

      // Memory limit - restricts Node.js V8 heap to 512MB (prevents memory growth over time)
      '--max_old_space_size=512',
    ],
  });
  let page;

  try {
    page = await browser.newPage();

    // Disable images and CSS to reduce memory usage
    await page.setRequestInterception(true);
    page.on('request', (r) => {
      if (['image', 'font', 'stylesheet'].includes(r.resourceType())) r.abort();
      else r.continue();
    });

    // Set viewport to reduce memory usage
    await page.setViewport({ width: 1024, height: 768 });

    // Set user agent to avoid bot detection
    await page.setUserAgent('Mozilla/5.0 (Linux; x86_64) AppleWebKit/537.36');

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

      function scrapeSimulationLastUpdate() {
        // eslint-disable-next-line no-undef
        const label = [...document.querySelectorAll('label')].find(
          (l) => l.textContent.trim() === 'Select a simulation preset',
        );

        if (!label) {
          return null;
        }

        // Search in the third level parent container (where the timestamp is located)
        const container = label.parentElement?.parentElement?.parentElement;
        if (!container) {
          return null;
        }

        const timestampPattern = /Last updated on .+ at .+ [A-Z]{2,4}$/;
        const timestampElement = [...container.querySelectorAll('*')].find(
          (el) => timestampPattern.test(el.textContent.trim()),
        );

        if (!timestampElement) {
          return null;
        }

        const timestampText = timestampElement.textContent.trim();

        try {
          // Parse: "Last updated on Jun 14 at 3:24 PM IDT"
          const match = timestampText.match(
            /Last updated on (.+) at (.+) ([A-Z]{2,4})$/,
          );
          if (!match) {
            return null;
          }

          const [, dateStr, timeStr] = match;
          const currentYear = new Date().getFullYear();

          const parsedDate = new Date(`${dateStr} ${currentYear} ${timeStr}`);

          if (isNaN(parsedDate.getTime())) {
            return null;
          }

          return parsedDate.toISOString();
        } catch (error) {
          console.warn('Failed to parse timestamp:', timestampText, error);
          return null;
        }
      }

      const simulationLastUpdate = scrapeSimulationLastUpdate();

      const result = {
        Drivers: scrapeTable('Drivers'),
        Constructors: scrapeTable('Constructors'),
        SimulationName: scrapeSimulationName(),
      };

      if (simulationLastUpdate) {
        result.SimulationLastUpdate = simulationLastUpdate;
      }

      return result;
    });

    await page.close();
    await browser.close();
    console.log(JSON.stringify(result, null, 2));

    return result;
  } catch (error) {
    if (page) {
      await page.close();
    }
    await browser.close();
    throw new Error(`Failed to fetch data: ${error.message}`);
  }
}
