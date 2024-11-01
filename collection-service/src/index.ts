import { configDotenv } from 'dotenv';
import { v4 as ipv4 } from 'public-ip';
import 'reflect-metadata';

console.clear();
require('./config');

const loadDotenv = async () => {
  configDotenv();

  if (!process.env.PUBLIC_IP) process.env.PUBLIC_IP = await ipv4();
};

const start = async () => {
  await loadDotenv();

  const app = require('./app');

  await app.start();
};

start();
