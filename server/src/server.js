import "dotenv/config";
import redisClient from "./config/redis.js";
import {  startPromotionCleanupJob,} from "./jobs/promotionCleanupJob.js";

import app from "./app.js";

const PORT = process.env.PORT || 5000;

startPromotionCleanupJob();

app.listen(PORT, () => {
  console.log(
    `Barter Trade server running on port ${PORT}`
  );
});