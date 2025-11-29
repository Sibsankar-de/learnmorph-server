import express from "express";
import cors from "cors"
import cookieParser from "cookie-parser";

const app = express();


app.use(cors({
    origin: [process.env.CORS_ORIGIN],
    credentials: true
}));
app.use(cookieParser())
app.use(express.json({ limit: '16kb' }))
app.use(express.urlencoded({ extended: true, limit: '16kb' }))
app.use(express.static('public'))

app.get("/ping", (req, res) => {
    res.send("Ping successful");
});

// import userRouter from "./routes/user.routes.js"
// import campaignRouter from "./routes/campaign.routes.js";
// import requestRouter from "./routes/request.routes.js";
// import aiRouter from "./routes/ai.routes.js";

// app.use("/api/users", userRouter);
// app.use("/api/v1/campaign", campaignRouter);
// app.use("/api/v1/request", requestRouter);
// app.use("/api/v1/ai", aiRouter);

export { app };