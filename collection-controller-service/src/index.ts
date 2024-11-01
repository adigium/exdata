import { configDotenv } from 'dotenv';

console.clear();

const loadDotenv = async () => {
  configDotenv();
};

const start = async () => {
  await loadDotenv();

  const app = require('./app');

  await app.start();
};

start();
