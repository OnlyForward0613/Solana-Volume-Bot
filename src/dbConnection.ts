import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

const dbHost = process.env.DB_HOST || "127.0.0.1";
const dbName = process.env.DB_NAME || "db";
const dbPort = process.env.DB_PORT || "27017";

export const db = mongoose
  .connect(`mongodb://${dbHost}:${dbPort}/${dbName}`)
  .then((res) => {
    if (res) {
      console.log(`Database connection successfully completed to ${dbName}`);
    }
  })
  .catch((err) => {
    console.error(err);
  });
