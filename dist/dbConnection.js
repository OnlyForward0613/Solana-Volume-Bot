"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const mongoose_1 = __importDefault(require("mongoose"));
dotenv_1.default.config();
const dbHost = process.env.DB_HOST || "127.0.0.1";
const dbName = process.env.DB_NAME || "db";
const dbPort = process.env.DB_PORT || "27017";
exports.db = mongoose_1.default
    .connect(`mongodb://${dbHost}:${dbPort}/${dbName}`)
    .then((res) => {
    if (res) {
        console.log(`Database connection successfully completed to ${dbName}`);
    }
})
    .catch((err) => {
    console.error(err);
});
