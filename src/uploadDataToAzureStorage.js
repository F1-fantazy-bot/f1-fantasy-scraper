const { BlobServiceClient } = require('@azure/storage-blob');

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

  const timestamp = new Date().toISOString();
  const blobName = `f1-fantasy-data-${timestamp}.json`;

  const jsonData = JSON.stringify(data);
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  try {
    await blockBlobClient.upload(jsonData, jsonData.length);
    console.log(`Data uploaded successfully to ${blobName}`);
  } catch (error) {
    throw new Error(`Failed to upload data to Azure: ${error.message}`);
  }
};
