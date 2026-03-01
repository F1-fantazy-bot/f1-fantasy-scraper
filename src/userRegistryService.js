// User Registry Service (read-only)
// Fetches registered user chat IDs from Azure Table Storage.
// Used by telegramService to dynamically send notifications to all registered users.

const { TableClient } = require('@azure/data-tables');

const TABLE_NAME = 'UserRegistry';
const PARTITION_KEY = 'User';

let tableClient;
let tableReady = false;

/**
 * Initialize the Azure Table Storage client.
 * Uses the same connection string as the rest of the app (AZURE_STORAGE_CONNECTION_STRING).
 */
function initializeTableClient() {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;

  if (!connectionString) {
    throw new Error(
      'Missing AZURE_STORAGE_CONNECTION_STRING for user registry storage',
    );
  }

  tableClient = TableClient.fromConnectionString(connectionString, TABLE_NAME);
  tableReady = false;
}

/**
 * Ensure the table client is initialized and the table exists.
 * The createTable call is only made once per process lifetime.
 */
async function ensureTable() {
  if (!tableClient) {
    initializeTableClient();
  }

  if (!tableReady) {
    await tableClient.createTable().catch(() => {
      // Table already exists — ignore
    });
    tableReady = true;
  }
}

/**
 * List all registered user chat IDs.
 * Returns an array of chat ID strings for sending notifications.
 * @returns {Promise<string[]>} Array of chat ID strings
 */
async function listAllUserChatIds() {
  await ensureTable();

  const chatIds = [];

  for await (const entity of tableClient.listEntities({
    queryOptions: { filter: `PartitionKey eq '${PARTITION_KEY}'` },
  })) {
    chatIds.push(entity.rowKey);
  }

  return chatIds;
}

module.exports = {
  listAllUserChatIds,
};
