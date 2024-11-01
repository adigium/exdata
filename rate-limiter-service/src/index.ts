import { configDotenv } from 'dotenv';
import 'reflect-metadata';

console.clear();
require('./di.config');

const loadDotenv = async () => {
  configDotenv();
};

const start = async () => {
  await loadDotenv();

  const app = require('./app');

  await app.start();
};

start();
