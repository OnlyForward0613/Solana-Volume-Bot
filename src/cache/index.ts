import { createClient } from "redis";
// import { redis } from "../config";

const redisURL = 'redis://localhost:6379';

const client = createClient({ url: redisURL });

client.on('connect', () => console.log("Cache is connected"));
client.on('ready', () => console.log("Cache is ready"));
client.on('reconnecting', () => console.log('Cache is reconnecting'));
client.on('error', (e) => console.error(`Cache is error: ${e}`));

(async () => {
  await client.connect();
})();

// If the node process ends, close the Cache connection
process.on("SIGINT", async () => {
  await client.disconnect();
});

export default client;




