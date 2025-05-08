// Load environment variables from .env file
import "dotenv/config";

import { createBot, startBot } from "./mainBot";
// Import Firebase to ensure it's initialized
import "./utils/firebase";

// Initialize and start the bot
console.log("Starting Bulaksumur Menfess Bot...");
console.log("-------------------------------------");

// Create the bot with all handlers
console.log("🔄 Creating bot with all handlers...");
const bot = createBot();
console.log("✅ Bot created successfully with all handlers initialized");

// Start the bot
console.log("🔄 Starting the bot...");
startBot(bot);
console.log("✅ Bot started successfully");

// Handle errors and graceful shutdown
const handleShutdown = () => {
  console.log("Shutting down bot...");
  bot.stop();
  process.exit(0);
};

process.on("SIGINT", handleShutdown);
process.on("SIGTERM", handleShutdown);
