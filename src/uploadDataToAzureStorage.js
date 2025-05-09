const { BlobServiceClient } = require('@azure/storage-blob');
const telegramService = require('./telegramService');

exports.uploadDataToAzureStorage = async function (data) {
  if (!data) {
    throw new Error('No data provided for upload');
  }

  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME;

  if (!connectionString || !containerName) {
    throw new Error('Missing required Azure storage configuration');
  }

  const blobServiceClient =
    BlobServiceClient.fromConnectionString(connectionString);
  const containerClient = blobServiceClient.getContainerClient(containerName);

  // const timestamp = new Date().toISOString();
  const blobName = `f1-fantasy-data.json`;

  const jsonData = JSON.stringify(data);
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  try {
    // Try to download existing data first
    let existingData;

    try {
      const downloadResponse = await blockBlobClient.download();
      const existingJsonString = await streamToString(
        downloadResponse.readableStreamBody,
      );
      existingData = JSON.parse(existingJsonString);
      console.log(
        'Existing data downloaded successfully. Simulation:',
        existingData?.simulationName,
      );

      // Check if we need to upload
      if (existingData?.simulationName === data.simulationName) {
        console.log('No simulation change detected, skipping upload');
        return;
      }
    } catch (error) {
      console.warn(
        'No existing data found or failed to download:',
        error.message,
      );
      // Continue with upload
    }

    await blockBlobClient.upload(jsonData, jsonData.length);
    console.log(`Data uploaded successfully to ${blobName}`);

    await telegramService.notifySimulationChange(
      existingData?.simulationName || 'None',
      data.simulationName,
    );
  } catch (error) {
    await telegramService.notifyError(error);
    throw new Error(`Failed to upload data to Azure: ${error.message}`);
  }
};

// Helper function to convert stream to string
async function streamToString(readableStream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    readableStream.on('data', (data) => {
      chunks.push(data.toString());
    });
    readableStream.on('end', () => {
      resolve(chunks.join(''));
    });
    readableStream.on('error', reject);
  });
}
