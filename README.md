# F1 Fantasy Scraper

A Node.js application that scrapes F1 Fantasy Tools team calculator data and stores it in Azure Blob Storage.

## Features

- Automated scraping of F1 Fantasy Tools team calculator
- Extracts driver and constructor data including:
  - Code/Name
  - Price
  - Delta
  - Points
- Stores timestamped data in Azure Blob Storage
- Docker support for containerized deployment

## Prerequisites

- Node.js
- Azure Storage Account
- Docker (optional)

## Environment Variables

Create a `.env` file with the following variables:

- `AZURE_STORAGE_CONNECTION_STRING`: Azure Storage connection string
- `AZURE_STORAGE_CONTAINER_NAME`: Azure Storage container name

## Installation

```bash
npm install
```

## Usage

```bash
npm start
```

## Docker Support

Build the image:

```bash
docker build -t f1-fantasy-scraper .
```

Run the container:

```bash
docker run --env-file .env f1-fantasy-scraper
```

## Development

- `npm run lint`: Run ESLint
- `npm run lint:fix`: Fix ESLint issues
- `npm run format`: Format code with Prettier

## Data Format

```json
{
  "drivers": [
    {
      "code": "XXX",
      "price": 0.0,
      "delta": 0.0,
      "pts": 0.0
    }
  ],
  "constructors": [
    {
      "code": "XXX",
      "price": 0.0,
      "delta": 0.0,
      "pts": 0.0
    }
  ],
  "simulationName": "string"
}
```
