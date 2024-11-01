# Rate Limiter Service

## Overview

The **Rate Limiter Service** is designed to manage API request limits across multiple instances of the Collector Service, ensuring compliance with exchange rate limits and avoiding throttling. It operates as a centralized control mechanism to handle requests in a scalable environment.

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

2. **Configure Environment**: Set up environment variables by copying `.env.example` to `.env` and adding necessary values.

This service is stateful; improvements are planned to enhance scalability. For more information, refer to the main [README](../README.md) and [Contributing](../CONTRIBUTING.md).
