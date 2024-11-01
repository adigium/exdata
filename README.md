# ExData – Realtime Exchange Data Collector

![Status](https://img.shields.io/badge/status-development-red) ![Exchanges](https://img.shields.io/badge/exchanges-6-blue) [![License](https://img.shields.io/github/license/adigium/exdata)]()

A ready-to-use solution for comprehensive real-time cryptocurrency data collection, offering developers, analysts, and professionals comprehensive access to market data from numerous centralized exchanges.

### [Introduction](#introduction) · [Disclaimer](#disclaimer) · [Installation](#installation) · [Usage](#usage) · [Documentation](#documentation) · [Known Issues](#known-issues) · [Issue Reporting](#issue-reporting) · [Contributing](#contributing) · [Contact Us](#contact-us)

## Introductions

The **ExData** is upcoming solution, which set to simplify real-time cryptocurrency data collection. Designed to empower community to build sophisticated trading algorithms, perform in-depth market analysis, and gain a competitive edge in the crypto space. With high-frequency data streams and effortless integration, **ExData** aims to speed up the way you interact with cryptocurrency markets. Stay tuned to unlock unparalleled insights and elevate your crypto projects with our cutting-edge data collection solution.

Currently **in development**, this powerful platform will offer developers, analysts, and finance professionals seamless access to comprehensive market data from centralized and decentralized exchanges — all unified in one place.

Powered by amazing [CCXT](https://github.com/ccxt/ccxt) library.

### Feature List

- Support for 6 cryptocurrency exchanges — more coming soon
- Autonomous configurable collection of currencies, markets, balances, deposit/withdrawal fees and real-time order books
- For now supports only SPOT markets
- Optional normalized data for currencies, market pairs and networks for cross-exchange analysis/interaction
- All the data is stored in MongoDB, so that it can be accessed from any language supporting its driver
- The solution is built with scalability in mind

## Disclaimer

Please note that this solution is currently not recommended for use in production environments.

I began this project a long time ago when I was still new to coding. As a result, there are areas that do not adhere to best coding and design practices (ref. [Known Issues](#known-issues)), and the code requires reconsideration and refactoring to meet production-ready standards. Over time, I plan to evolve this project into a production-ready solution, so the repository is currently undergoing maintenance.

If you're interested in participating, feel free to contribute! See the [Contribute section](#contributing) for more information.

The library is under [MIT license](https://github.com/adigium/exdata/blob/master/LICENSE.txt), that means it's absolutely free for any developer to build commercial and opensource software on top of it, but use it at your own risk with no warranties, as is.

## Installation

To set up **ExData**, please follow the steps below to ensure all services and dependencies are correctly configured.

### Prerequisites

1. **MongoDB Instance**: A MongoDB instance is required to store all collected data. You’ll need to import the initial dataset from the `db-data` folder. Each file in this folder is named after its corresponding collection, so ensure the data is imported accordingly.
2. **Node.js**: Make sure you have Node.js version **20 or higher** if you plan to run any service without Docker.

3. **Package Manager**: This project uses `pnpm` as its package manager. Install it globally if you haven’t done so already:
   ```bash
   npm install -g pnpm
   ```

### Docker Setup

Each service is wrapped in a Docker container for streamlined setup. Follow these steps to build and run each service in Docker:

1. **Navigate to Each Service Directory**:

   - Go to the folder of each service (`collector-service`, `rate-limiter-service`, `collection-controller-service`).

2. **Build Docker Images**:

   - Run the following command in each service’s folder to build its Docker image:
     ```bash
     pnpm run docker:build
     ```

3. **Configure Environment Variables**:

   - Each service has an `.env.example` file. Duplicate this file and name it `.env` in each service folder, then configure the necessary environment variables (e.g., API keys).

4. **Run MongoDB**:
   - Ensure that your MongoDB instance is running, as each service will need access to it to store and retrieve data.

### Running Without Docker

If you prefer to run the services outside Docker, follow these steps:

1. **Install Dependencies**:

   - In each service folder, install the necessary npm dependencies:
     ```bash
     pnpm install
     ```

2. **Configure Environment Variables**:

   - Copy `.env.example` to `.env` in each service folder and set the required environment variables. Ensure MongoDB is accessible to these services.

3. **Start Each Service**:
   - Run each service with the following command:
     ```bash
     pnpm start
     ```
   - **Order of Startup**: Generally, services can start in any order; however, ensure the `collection-controller-service` is started before the `collector-service` to avoid startup issues.

### Using Kubernetes Infrastructure

You can deploy the entire infrastructure with Kubernetes, which will spin up one instance of each service along with a MongoDB instance.

1. **Configure Environment Variables**:

   - Set up your variables as needed in the Kubernetes configuration (e.g. API keys).

2. **Upload Initial MongoDB Data**:
   - Import the initial data from the `db-data` folder into the MongoDB instance.

---

**Note**: For all setups, ensure that MongoDB is populated with data from the `db-data` folder to enable smooth operation of all services.

This completes the installation process. You are now ready to run **ExData** and start collecting cryptocurrency data in real-time!

## Documentation

In progress...

## Usage

Currently, the only way to access the data collected by **ExData** is directly through the MongoDB instance, where all information is stored. Below is an overview of the collections available in the database:

### Primary Collections

- **Assets**: Unified collection of assets (or currencies) that are independent of any specific exchange.
- **Networks**: Contains unified networks used for transactions.
- **Exchanges**: Stores information on all supported cryptocurrency exchanges.
- **ExchangeAssets**: Represents specific assets (currencies) as they exist on each exchange. Each document corresponds to a unique currency on a specific exchange.
- **ExchangeAssetNetworks**: Details the networks available for deposits and withdrawals of each specific currency on each specific exchange.
- **Markets**: Holds all available spot trading pairs across exchanges.
- **OrderBooks**: Contains the latest order books for each trading pair, reflecting real-time market depth.

### System Collections

These collections are utilized by the system for managing settings, logging, and controlling task execution:

- **Settings**: Stores centralized settings for the system, allowing configurable parameters.
- **CollectorServiceInstances**: Lists all registered instances of the `collection-service`, along with their statuses.
- **TaskDetails**: Contains configuration details for all supported task types in the system.
- **TaskLogMessages**: Logs messages from `collection-service` instances to track the status of tasks (e.g., whether a task completed successfully or encountered errors).
- **TaskControlMessages**: Reserved for debugging purposes; stores control messages sent to `collection-service` instances.

---

### Planned Features

In future updates, a centralized API will be introduced to streamline data access, along with a user-friendly UI interface. This will provide a configuration panel and facilitate usage for non-technical users, enabling easier data access and management.

## Known Issues

The following are significant issues currently affecting the project. Note that this list does not include areas needing refactoring, such as improvements in code architecture and styling:

- **Security Practices**: Security across the system requires review. For example, Kubernetes secrets are not currently utilized but should be implemented to secure sensitive data.
- **Distributed Task Assignment Instability**: The process of assigning tasks across distributed services is unreliable and needs debugging and improvement for consistent performance.
- **Inefficient Data Storage**: The current data storage layer is not optimized for handling real-time data, leading to inefficiencies in storage and retrieval.
- **Rate Limiter Scalability**: The `rate-limiter-service` is currently stateful, which limits scalability. Under high load, this may become a bottleneck.
- **Redundant Code**: Code duplication exists across services, particularly in the `frameworks` folder. Common code should be consolidated into a shared package or module.
- **Lack of Test Coverage**: The project currently has no automated tests, with 0% test coverage. Comprehensive testing needs to be implemented.
- **Inconsistent Error Handling**: Error and failure handling is inconsistent and needs a unified approach across the project to improve reliability.
- **Logging Mechanism**: The logging system is inconsistent and requires a complete overhaul to provide clearer, more actionable logs.
- **Subscription Management**: While the `collection-service` can unsubscribe from streams, this feature is not fully implemented. Subscription management also lacks a “diff” mechanism, which is needed to handle real-time changes efficiently.
- **Incomplete Data Unification**: Data unification is inconsistent due to limitations in the uncertified [CCXT](https://github.com/ccxt/ccxt) library. Blockchain networks are mapped manually, as even certified exchanges lack uniformity.
- **Kucoin WebSocket Issues**: WebSocket connections for the `Kucoin` exchange are currently non-functional and require fixing.

---

This list highlights the primary areas for improvement. Addressing these issues will enhance the project’s stability, scalability, and overall performance.

## Issue Reporting

Before creating a new issue, please check existing issues to avoid duplicates. This helps keep the issue tracker organized and allows us to address concerns more efficiently.

## Contributing

At this stage of the project, there are no specific rules for contributing. All contributions are welcome, whether they involve fixing code, refactoring, or adding new features.

## Contact Us

If you need any help or regarding any questions please feel free to contact me via bagadirov.ozzie@gmail.com
