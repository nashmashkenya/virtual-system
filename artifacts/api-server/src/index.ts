import "./load-env";
import app from "./app";
import { logger } from "./lib/logger";
import { seedDatabase } from "./lib/db-seed";
import http from "node:http";
import { WebSocketServer } from "ws";
import { initWebSocketServer } from "./lib/socket";

// Auto-seed the database with curriculum subjects
seedDatabase();

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

initWebSocketServer(wss);

server.on("upgrade", (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws, request);
  });
});

server.listen(port, () => {
  logger.info({ port }, "Server listening (with WebSockets active)");
});
