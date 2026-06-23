const redis = require("redis");

let redisClient;
let isRedisConnected = false;

const initCache = async () => {
  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
  
  redisClient = redis.createClient({ 
    url: redisUrl,
    socket: {
      reconnectStrategy: (retries) => {
        // Exponential backoff, cap at 3 seconds
        return Math.min(retries * 100, 3000);
      }
    }
  });

  let hasLoggedError = false;
  redisClient.on("error", (err) => {
    if (!hasLoggedError) {
      console.error("Redis Client Error. Continuing without cache:", err.message);
      hasLoggedError = true;
    }
    isRedisConnected = false;
  });

  redisClient.on("ready", () => {
    console.log("Redis cache connected successfully.");
    isRedisConnected = true;
    hasLoggedError = false; // Reset error log on reconnect
  });

  redisClient.on("reconnecting", () => {
    isRedisConnected = false;
  });

  try {
    await redisClient.connect();
  } catch (err) {
    console.error("Failed to connect to Redis. Caching will be disabled.");
  }
};

const getCachedEmbedding = async (key) => {
  if (!isRedisConnected) return null;
  try {
    const data = await redisClient.get(key);
    if (data) return JSON.parse(data);
  } catch (err) {
    console.error("Redis Get Error:", err);
  }
  return null;
};

const setCachedEmbedding = async (key, embeddingArray, ttlSeconds = 2592000) => { // Default 30 days
  if (!isRedisConnected) return;
  try {
    await redisClient.setEx(key, ttlSeconds, JSON.stringify(embeddingArray));
  } catch (err) {
    console.error("Redis Set Error:", err);
  }
};

module.exports = {
  initCache,
  getCachedEmbedding,
  setCachedEmbedding
};
