import { createClient } from "redis";

const redis = {
  host: process.env.REDIS_HOST || "localhsot",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD || "",
};

// const redisURL = 'redis://127.0.0.1:6379';

const redisURL = `redis://default:${redis.password}@${redis.host}:${redis.port}`;

const client = createClient({ url: redisURL })

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

export default client;




