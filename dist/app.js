"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
// import bodyParser from "body-parser";
// import { db } from "./dbConnection";
require("./cache");
const main_route_1 = __importDefault(require("./routes/main.route"));
const cors_1 = __importDefault(require("cors"));
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
app.use(express_1.default.json());
const whitelist = [
    "http://localhost:3000",
    "https://pumpfun-volume-bot-run-ui.vercel.app",
];
app.use((0, cors_1.default)({
    origin: whitelist,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // Allowed HTTP methods
    credentials: true // Allow credentials (cookies, authorization headers, etc.)
}));
app.use(express_1.default.urlencoded({ extended: true }));
app.get("/", (req, res) => {
    res.send("Welcome to our volume bot!");
});
app.use("/api/v1", main_route_1.default);
// When using mongodb
// db.then(() => {
//   app.listen(port, () => {
//     console.log(`Server is running on port http://localhost:${port}`);
//   });
// });
app
    .listen(port, () => {
    console.log(`server running on port : ${port}`);
})
    .on('error', (e) => console.error(e));
