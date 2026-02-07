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
 */
import * as amqp from "amqplib";

const RABBIT_URL: string = "amqp://rabbitmq";
const RAW_EXCHANGE: string = "emotes";
const RAW_ROUTING: string = "emote.raw";
const AGG_EXCHANGE: string = "aggregated-emote-data";
const AGG_ROUTING: string = "emote.aggregated";

// incoming raw messages
const rawMessages: Array<{ emotes: string[]; timestamp: string }> = [];

// per-minute aggregated counts (map: minute -> { total, counts })
const emoteCounts: {
  [minute: string]: { total: number; counts: { [emote: string]: number } };
} = {};
const analyzedMinutes = new Set<string>();

type Settings = {
  interval: number;
  threshold: number;
  allowedEmotes: string[];
};

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

          // slice to minute
          const minuteKey = new Date(payload.timestamp)
            .toISOString()
            .slice(0, 16);
          // aggregate counts for this minute
          if (!emoteCounts[minuteKey])
            emoteCounts[minuteKey] = { total: 0, counts: {} };
          // count only allowed emotes
          for (const e of payload.emotes) {
            if (!settings.allowedEmotes.includes(e)) continue;
            emoteCounts[minuteKey].counts[e] =
              (emoteCounts[minuteKey].counts[e] || 0) + 1;
            emoteCounts[minuteKey].total += 1;
          }

          // analyze the minute
          if (
            emoteCounts[minuteKey].total >= settings.interval &&
            !analyzedMinutes.has(minuteKey)
          )
            analyzeAndPublishMinute(minuteKey, ch);
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

// perform analysis and publish aggregated moments to AGG_EXCHANGE
async function analyzeAndPublishMinute(minuteKey: string, ch: amqp.Channel) {
  const bucket = emoteCounts[minuteKey];
  if (!bucket) {
    console.warn("No data for minute: ", minuteKey);
    return;
  }
  const total = bucket.total;
  const moments: Array<{
    emote: string;
    count: number;
    total: number;
    ratio: number;
  }> = [];

  // find significant moments
  for (const [emote, count] of Object.entries(bucket.counts)) {
    const ratio = count / total;
    if (ratio > settings.threshold) {
      moments.push({ emote, count, total, ratio });
    }
  }

  // publish if there is significant moments
  if (moments.length > 0) {
    const payload = {
      minute: minuteKey,
      moments,
      generatedAt: new Date().toISOString(),
    };
    try {
      ch.publish(
        AGG_EXCHANGE,
        AGG_ROUTING,
        Buffer.from(JSON.stringify(payload)),
      );
      console.log("Published significant moments for", minuteKey, moments);
    } catch (err) {
      console.error("Failed to publish significant moments", err);
    }
  } else {
    console.log("No significant moments for", minuteKey);
  }

  // mark analyzed and delete old data
  analyzedMinutes.add(minuteKey);
  delete emoteCounts[minuteKey];
}

// TODO: REST API for updating settings (interval, threshold, allowed emotes)

startSubscriber();
