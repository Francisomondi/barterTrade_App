import express from "express";
import cors from "cors";
import passport from "./config/passport.js";
import authRoutes from "./routes/authRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import listingRoutes from "./routes/listingRoutes.js";
import offerRoutes from "./routes/offerRoutes.js";
import tradeRoutes from "./routes/tradeRoutes.js";

import uploadRoutes from "./routes/uploadRoutes.js";
import matchRoutes from "./routes/matchRoutes.js";

import notificationRoutes from "./routes/notificationRoutes.js";


const app = express();


app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.use(passport.initialize());

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Barter Trade API is running",
  });
});

app.use("/api/auth", authRoutes);
app.use( "/api/categories", categoryRoutes);
app.use( "/api/listings", listingRoutes);
app.use("/api/offers",offerRoutes)
app.use("/api/trades", tradeRoutes);

app.use("/api/uploads", uploadRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/notifications", notificationRoutes);

export default app;