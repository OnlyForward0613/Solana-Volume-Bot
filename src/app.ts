import express, { Request, Response } from "express";
// import bodyParser from "body-parser";
// import { db } from "./dbConnection";
import './cache';
import router from "./routes/main.route";

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req: Request, res: Response) => {
  res.send("Welcome to the movie database!");
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

