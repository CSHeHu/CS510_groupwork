/**
 * Emote Generator service
 *
 * Publishes emote events to a RabbitMQ topic exchange at a regular interval.
 * Each event is a JSON object: { emotes: string[], timestamp: string }
 *
 * Usage:
 *  - Configure RabbitMQ endpoint with `RABBITMQ_URL` (default: amqp://rabbitmq).
 *  - Configure exchange name with `EXCHANGE` (default: emotes) and routing key
 *    with `ROUTING_KEY` (default: emote.raw).
 *
 * AI usage declaration: Github Copilot - GPT-5 mini model was used to create comments and
 * docstrings in this file. Also used for finding bugs on ampqlib related code.
 */
import * as amqp from "amqplib";

// Allow overriding the broker URL from environment for local dev/testing.
const RABBIT_URL: string = "amqp://rabbitmq";
const EXCHANGE: string = "emotes";
const ROUTING_KEY: string = "emote.raw";

const EMOTES: string[] = ["😭", "😢", "😠", "😂", "😲", "❤️"];

/**
 * Return a random element from `arr`.
 * @param arr - array of values
 */
function randChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Decide whether to emit a burst of emotes (20% probability).
 * @returns true if this event should be a burst
 */
function maybeBurst(): boolean {
  return Math.random() < 0.2; // 20% chance
}

/**
 * Create an emote event object. Either a single emote or a burst of same emote.
 * @returns event object containing `emotes` and ISO `timestamp`
 */
function makeEvent() {
  if (maybeBurst()) {
    // burst of 3 emotes
    const count = 3;
    const emote = randChoice(EMOTES);
    return {
      emotes: Array(count).fill(emote),
      timestamp: new Date().toISOString(),
    };
  }
  // single emote
  return { emotes: [randChoice(EMOTES)], timestamp: new Date().toISOString() };
}

async function start() {
  try {
    const conn = await amqp.connect(RABBIT_URL);
    const ch = await conn.createChannel();
    await ch.assertExchange(EXCHANGE, "topic", { durable: false });
    console.log("Emote generator connected to RabbitMQ:", RABBIT_URL);

    const timer = setInterval(() => {
      const evt = makeEvent();
      const payload = Buffer.from(JSON.stringify(evt));
      ch.publish(EXCHANGE, ROUTING_KEY, payload);
      console.log("Published", evt);
    }, 1000);

    process.on("SIGINT", async () => {
      clearInterval(timer);
      try {
        await ch.close();
        await conn.close();
      } catch (e) {}
      process.exit(0);
    });
  } catch (err) {
    console.error("Failed to start emote-generator:", err);
    process.exit(1);
  }
}

/**
 * Connect to RabbitMQ, assert the exchange and publish events every second.
 * The publisher uses a topic exchange with the routing key defined in
 * `ROUTING_KEY`.
 */
start();
