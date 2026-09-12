const Redis = require('ioredis');

const redisClient = new Redis(process.env.REDIS_URL, {
  tls: process.env.REDIS_URL.startsWith('rediss://') ? {} : undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: false
});

redisClient.on('error', (err) => console.error('Redis Client Error:', err.message));
redisClient.on('connect', () => console.log('✅ Shared Redis client connected'));
redisClient.on('ready', () => console.log('✅ Shared Redis client ready'));

module.exports = redisClient;