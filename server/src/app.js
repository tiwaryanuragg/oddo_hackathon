import express from "express";
import cors from "cors";
import morgan from "morgan";
import { env } from "./config/env.js";
import apiRoutes from "./routes/index.js";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler.js";

const app = express();

// Core middleware
app.use(cors({ origin: env.clientOrigin, credentials: true }));
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));
if (env.nodeEnv === "development") app.use(morgan("dev"));

// Routes
app.get("/", (_req, res) => res.json({ service: "AssetFlow API", version: "1.0.0" }));
app.use("/api", apiRoutes);

// 404 + centralized error handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
