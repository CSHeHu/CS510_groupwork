/**
 * Analytics Service (Server B)
 *
 * Subscribes to raw emote events produced by the Emote Generator, aggregates
 * emote counts per minute, detects significant moments and publishes
 * aggregated moments to a separate exchange. Also exposes REST API
 * for controlling analysis settings (interval, threshold, allowed emotes).
 *
 *
 *
 * AI usage declaration: GitHub Copilot - GPT-5 mini model was used to create
 * comments and docstrings in this file. AI was also used to help design
 * the data structures and logic for aggregating and analyzing the emote data.
 * Also helped find bugs in the AMQP-related code and provided
 * suggestions on the publishing of aggregated results. AI also helped on typescript
 * type definitions.
 *
 * Codesnippets and instructions for ampqlib usage were used from https://www.npmjs.com/package/amqplib
 */
import * as amqp from "amqplib";
import { startSettingsApi } from "./api.js";
import { Settings } from "./types.js";

const RABBIT_URL: string = "amqp://rabbitmq";
const RAW_EXCHANGE: string = "emotes";
const RAW_ROUTING: string = "emote.raw";
const AGG_EXCHANGE: string = "aggregated-emote-data";
const AGG_ROUTING: string = "emote.aggregated";

// incoming raw messages
const rawMessages: Array<{ emotes: string[]; timestamp: string }> = [];

// settings
const settings: Settings = {
  interval: 10, // number of messages to collect before analysis
  threshold: 0.3, // fraction threshold for significance
  allowedEmotes: ["😭", "😢", "😠", "😂", "😲", "❤️"],
};

// AMQP channel
let amqpChannel: amqp.Channel | null = null;

async function startSubscriber() {
  try {
    const conn = await amqp.connect(RABBIT_URL);
    const ch = await conn.createChannel();
    await ch.assertExchange(RAW_EXCHANGE, "topic", { durable: false });
    await ch.assertExchange(AGG_EXCHANGE, "topic", { durable: false });
    const qok = await ch.assertQueue("", { exclusive: true });
    await ch.bindQueue(qok.queue, RAW_EXCHANGE, RAW_ROUTING);
    console.log("Analytics connected to RabbitMQ, queue:", qok.queue);

    amqpChannel = ch;

    ch.consume(
      qok.queue,
      (msg: amqp.ConsumeMessage | null) => {
        if (!msg) return;
        try {
          const payload = JSON.parse(msg.content.toString());
          rawMessages.push({
            emotes: payload.emotes,
            timestamp: payload.timestamp,
          });
          // trim if rans too long
          if (rawMessages.length > 10000) rawMessages.shift();

          // analyze batch
          if (rawMessages.length >= settings.interval) {
            const batch = rawMessages.splice(0, settings.interval);
            // build per-minute buckets from the batch
            const buckets: {
              [minute: string]: {
                total: number;
                counts: { [emote: string]: number };
              };
            } = {};

            for (const m of batch) {
              const minuteKey = new Date(m.timestamp)
                .toISOString()
                .slice(0, 16);
              if (!buckets[minuteKey])
                buckets[minuteKey] = { total: 0, counts: {} };
              for (const e of m.emotes) {
                if (!settings.allowedEmotes.includes(e)) continue;
                buckets[minuteKey].counts[e] =
                  (buckets[minuteKey].counts[e] || 0) + 1;
                buckets[minuteKey].total += 1;
              }
            }

            // analyze each minute bucket and publish if significant moments found
            for (const [minuteKey, bucket] of Object.entries(buckets)) {
              const total = bucket.total;
              const moments: Array<{
                emote: string;
                count: number;
                total: number;
                ratio: number;
              }> = [];

              for (const [emote, count] of Object.entries(bucket.counts)) {
                const ratio = total > 0 ? count / total : 0;
                if (ratio > settings.threshold) {
                  moments.push({ emote, count, total, ratio });
                }
              }

              if (moments.length > 0) {
                const payloadOut = {
                  minute: minuteKey,
                  moments,
                  generatedAt: new Date().toISOString(),
                };
                try {
                  ch.publish(
                    AGG_EXCHANGE,
                    AGG_ROUTING,
                    Buffer.from(JSON.stringify(payloadOut)),
                  );
                  console.log(
                    "Published significant moments for",
                    minuteKey,
                    moments,
                  );
                } catch (err) {
                  console.error("Failed to publish significant moments", err);
                }
              } else {
                console.log("No significant moments for", minuteKey);
              }
            }
          }
        } catch (err) {
          console.warn("Failed to parse message", err);
        }
      },
      { noAck: true },
    );
  } catch (err) {
    console.error("Analytics failed to start subscriber:", err);
    process.exit(1);
  }
}

// start the API and then the subscriber
startSettingsApi({
  settings,
  port: 3000,
});

startSubscriber();
