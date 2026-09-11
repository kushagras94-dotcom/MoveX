const { Queue } = require('bullmq');
const redisClient = require('./redisClient');

const rideMatchQueue = new Queue('rideMatch', { connection: redisClient });

module.exports = { rideMatchQueue, connection: redisClient };