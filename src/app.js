import express from "express";
import cors from "cors"
import cookieParser from "cookie-parser";

const app = express();


app.use(cors({
    origin: "*",
    credentials: true
}));
app.use(cookieParser())
app.use(express.json({ limit: '16kb' }))
app.use(express.urlencoded({ extended: true, limit: '16kb' }))
app.use(express.static('public'))

app.get("/ping", (req, res) => {
    res.send("Ping successful");
});

import userRouter from "./routes/user.routes.js"
import courseRouter from "./routes/course.routes.js";
import topicRouter from "./routes/topic.routes.js";
// import aiRouter from "./routes/ai.routes.js";

app.use("/api/users", userRouter);
app.use("/api/learning-paths", courseRouter);
app.use("/api/topics", topicRouter);
// app.use("/api/v1/ai", aiRouter);

export { app };