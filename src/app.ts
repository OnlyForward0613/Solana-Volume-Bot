import express, { Request, Response } from "express";
// import bodyParser from "body-parser";
// import { db } from "./dbConnection";
import './config';
import './cache';
import router from "./routes/main.route";
import cors from 'cors';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
const whitelist = [
  "http://localhost:3000",
  "https://pumpfun-volume-bot-run-ui.vercel.app",
];
app.use(cors({
  origin: whitelist,
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // Allowed HTTP methods
  credentials: true // Allow credentials (cookies, authorization headers, etc.)
}))
app.use(express.urlencoded({ extended: true }));

app.get("/", (req: Request, res: Response) => {
  res.send("Welcome to our volume bot!");
});

app.use("/api/v1", router);


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



