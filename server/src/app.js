import express from "express";
import cors from "cors";

import passport from "./config/passport.js";

import authRoutes from "./routes/authRoutes.js";

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());

app.use(passport.initialize());

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Barter Trade API is running",
  });
});

app.use("/api/auth", authRoutes);

export default app;