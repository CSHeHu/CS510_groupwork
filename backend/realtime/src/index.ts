/**
 * Realtime Service (Server A)
 *
 * Connects to RabbitMQ `aggregated-emote-data` exchange, consumes significant
 * moments published by the Analytics service, and broadcasts them to connected
 * WebSocket clients.
 *
 * AI usage declaration: GitHub Copilot - GPT-5 mini model was used to create
 * comments and docstrings in this file. AI was also used to help implementing the Websocket server
 * and the RabbitMQ consumer. Also helped find bugs in the AMQP-related code and provided
 * suggestions on the broadcasting of aggregated results to WebSocket clients. AI also helped on typescript
 * type definitions.
 *
 * Code snippets and instructions were used from https://www.npmjs.com/package/ws
 * Code snippets and instructions for ampqlib usage were used from https://www.npmjs.com/package/amqplib
 */

import * as amqp from "amqplib";
import express from "express";
import { WebSocketServer, WebSocket } from "ws";

const RABBIT_URL = "amqp://rabbitmq";
const AGG_EXCHANGE = "aggregated-emote-data";
const AGG_ROUTING = "emote.aggregated";

async function start() {
  // start HTTP + WebSocket server
  const app = express();
  const port = 4000;

  const server = app.listen(port, () =>
    console.log(`Realtime HTTP/WebSocket listening on ${port}`),
  );

  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws: WebSocket) => {
    console.log("WebSocket client connected");
    ws.on("close", () => console.log("WebSocket client disconnected"));
  });

  // connect to RabbitMQ and consume aggregated messages
  try {
    const conn = await amqp.connect(RABBIT_URL);
    const ch = await conn.createChannel();
    await ch.assertExchange(AGG_EXCHANGE, "topic", { durable: false });
    const q = await ch.assertQueue("", { exclusive: true });
    await ch.bindQueue(q.queue, AGG_EXCHANGE, AGG_ROUTING);
    console.log("Realtime Service connected to RabbitMQ, queue:", q.queue);

    ch.consume(
      q.queue,
      (msg: amqp.ConsumeMessage | null) => {
        if (!msg) return;
        try {
          const payload = JSON.parse(msg.content.toString());
          // broadcast to all connected WebSocket clients
          const text = JSON.stringify(payload);
          wss.clients.forEach((client) => {
            // TODO: fix the any type
            if (client.readyState === WebSocket.OPEN) {
              client.send(text);
            }
          });
          console.log("Broadcasted aggregated moment", payload);
        } catch (err) {
          console.warn("Failed to parse aggregated message", err);
        }
      },
      { noAck: true },
    );
  } catch (err) {
    console.error("Realtime failed to connect to RabbitMQ:", err);
    process.exit(1);
  }
}

start();
