import "dotenv/config";

import { createBot, startBot } from "./mainBot";
import "./utils/firebase";

console.log("Starting Bulaksumur Menfess Bot...");
console.log("-------------------------------------");

const bot = createBot();
startBot(bot);

// Handle errors and graceful shutdown
const handleShutdown = () => {
  console.log("Shutting down bot...");
  bot.stop();
  process.exit(0);
};

process.on("SIGINT", handleShutdown);
process.on("SIGTERM", handleShutdown);
