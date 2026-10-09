import "dotenv/config";
import redisClient from "./config/redis.js";
//import {  startPromotionCleanupJob,} from "./jobs/promotionCleanupJob.js";

import app from "./app.js";

const PORT = process.env.PORT || 5000;

//startPromotionCleanupJob();

const server = app.listen(PORT, () => {
  console.log("========================================");
  console.log("🚀 BarterConnekt Backend Started");
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🔌 Port: ${PORT}`);
  console.log("========================================");
});

server.on("error", (error) => {
  console.error("SERVER STARTUP ERROR:", error);
  process.exit(1);
});