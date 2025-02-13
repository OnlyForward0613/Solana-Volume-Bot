"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const redis_1 = require("redis");
const config_1 = require("../config");
// const redisURL = 'redis://127.0.0.1:6379';
const redisURL = `redis://default:${config_1.redis.password}@${config_1.redis.host}:${config_1.redis.port}`;
const client = (0, redis_1.createClient)({ url: redisURL });
client.on('connect', () => console.log("Cache is connected"));
client.on('ready', () => console.log("Cache is ready"));
client.on('reconnecting', () => console.log('Cache is reconnecting'));
client.on('error', (e) => console.error(`Cache is error: ${e}`));
(async () => {
    await client.connect().catch(console.error);
})();
// If the node process ends, close the Cache connection
process.on("SIGINT", async () => {
    await client.disconnect();
});
exports.default = client;
