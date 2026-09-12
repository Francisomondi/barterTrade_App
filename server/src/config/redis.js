import "dotenv/config";
import { createClient } from "redis";

const redisUrl = process.env.REDIS_URL;

let redisClient = null;

console.log("=================================");
console.log("Initializing Redis...");
console.log("REDIS_URL:", redisUrl ? "FOUND" : "NOT FOUND");
console.log("=================================");

if (redisUrl) {
redisClient = createClient({
url: redisUrl,
});

redisClient.on("error", (error) => {
console.error("Redis Client Error:", error.message);
});

redisClient.on("connect", () => {
console.log("Redis connecting...");
});

redisClient.on("ready", () => {
console.log("Redis connected and ready");
});

redisClient.on("reconnecting", () => {
console.log("Redis reconnecting...");
});

redisClient.on("end", () => {
console.log("Redis connection closed");
});

try {
await redisClient.connect();
} catch (error) {
console.error("Redis connection failed:", error.message);
redisClient = null;
}
} else {
console.warn(
"REDIS_URL is not defined. Redis caching is disabled."
);
}

export default redisClient;
