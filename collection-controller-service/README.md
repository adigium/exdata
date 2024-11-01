# Collection Controller Service

## Overview

The **Collection Controller Service** is the central management system that coordinates data collection tasks across multiple Collector Service instances. It assigns, monitors, and logs task statuses to maintain an efficient and balanced data collection process.

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

2. **Configure Environment**: Set up necessary environment variables by copying `.env.example` to `.env` and configuring as needed.

3. **Order of Startup**: Ensure this service is started before any Collector Service instances for smooth operation.

## Key Dependencies

- MongoDB for task logging and state management.

The Collection Controller Service ensures that data collection is balanced and reliable. For more details, see the main [README](../README.md) and explore the [Contributing](../CONTRIBUTING.md) guidelines.
