import { createClient } from "redis";
// import { redis } from "../config";

const redisURL = 'redis://localhost:6379';
// const redisURL = 'redis://Qwe123!@#@redis-14659.c256.us-east-1-2.ec2.redns.redis-cloud.com:14659';

const client = createClient({ url: redisURL });
// const client = createClient({
//   username: 'default',
//   password: 'Qwe123!@#',
//   socket: {
//     host: 'redis-14659.c256.us-east-1-2.ec2.redns.redis-cloud.com',
//     port: 14659
//   }
// });

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




