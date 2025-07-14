import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { errorHandler } from "./middlewares/errorHandler.middlewares.js";

const app = express();

app.use(
    cors({
        origin: process.env.CORS_ORIGIN,
        credentials: true,
    })
);

app.use(express.static("public"));
app.use(cookieParser());
app.use(
    express.json({
        limit: "16kb",
        strict: true,
    })
);
app.use(
    express.urlencoded({
        extended: true,
        limit: "16kb",
    })
);

import userRouter from "./routes/user.route.js";
import playlistRouter from "./routes/playlist.route.js";
import commentRouter from "./routes/comment.route.js";
import videoRouter from "./routes/video.route.js";
import subscriptionRouter from "./routes/subscription.route.js";

app.use("/api/v1/users", userRouter);
app.use("/api/v1/playlist", playlistRouter);
app.use("/api/v1/comments", commentRouter);
app.use("/api/v1/videos", videoRouter);
app.use("/api/v1/subscriptions", subscriptionRouter);

app.use(errorHandler);

export { app };
  