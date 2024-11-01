# Collector Service

## Overview

The **Collector Service** is responsible for gathering real-time cryptocurrency data from multiple exchanges and storing it in a MongoDB database. It connects to various exchange APIs and WebSocket endpoints to collect order books, trading pairs, assets, and other market data.

## Usage

1. **Start the Service**:

   - Use Docker:
     ```bash
     pnpm run docker:build
     ```
   - Without Docker:
     ```bash
     pnpm install
     pnpm start
     ```

2. **Configure Environment**: Copy `.env.example` to `.env` and populate required environment variables.

3. **Accessing Data**: All data is stored in MongoDB. Refer to the database collections to view assets, markets, and other real-time data.

## Key Dependencies

- MongoDB for data storage.
- Exchange API keys for data access.

For additional details, see the main [README](../README.md) or contribute by reviewing the [Contributing](../CONTRIBUTING.md) section.
