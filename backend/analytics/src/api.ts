/**
 * Analytics Service (Server B) REST API
 *
 * REST API for controlling analysis settings (interval, threshold, allowed emotes).
 *
 * AI usage declaration: GitHub Copilot - GPT-5 mini model was used to create
 * comments and docstrings in this file. AI also helped on typescript type definitions.
 * AI also helped with starting the API and the subscriber when npm runs start script.
 */

import express from "express";
import { Settings } from "./types.js";

/**
 * Start the Settings API server.
 *
 * Exposes REST endpoints to read and modify analysis settings used by the
 * analytics subscriber.
 *
 * @param opts.settings - shared settings object (in-memory)
 * @param opts.port - port to listen on (defaults to 3000)
 * @returns the Express `app` instance (useful for tests)
 */
export function startSettingsApi(opts: { settings: Settings; port?: number }) {
  const { settings, port } = opts;
  const app = express();
  app.use(express.json());

  // GET current interval
  // Returns the number of messages the server will collect before running analysis
  app.get("/settings/interval", (_req, res) => {
    res.json({ interval: settings.interval });
  });

  // PUT update interval (number of messages before analysis)
  app.put("/settings/interval", (req, res) => {
    const { interval } = req.body;
    settings.interval = interval;
    return res.json({ interval: settings.interval });
  });

  // GET threshold
  app.get("/settings/threshold", (_req, res) => {
    res.json({ threshold: settings.threshold });
  });

  // PUT update threshold
  app.put("/settings/threshold", (req, res) => {
    const { threshold } = req.body;
    settings.threshold = threshold;
    return res.json({ threshold: settings.threshold });
  });

  // GET allowed emotes
  app.get("/settings/allowed-emotes", (_req, res) => {
    res.json({ allowedEmotes: settings.allowedEmotes });
  });

  // PUT replace allowed emotes list
  app.put("/settings/allowed-emotes", (req, res) => {
    const { allowedEmotes } = req.body;
    settings.allowedEmotes = allowedEmotes;
    return res.json({ allowedEmotes: settings.allowedEmotes });
  });

  // POST add a single emote to allowed list
  app.post("/settings/allowed-emotes", (req, res) => {
    const { emote } = req.body;

    // check if emote is allready in the list, if not add it
    if (!settings.allowedEmotes.includes(emote)) {
      settings.allowedEmotes.push(emote);
      return res
        .status(201)
        .json({ emote, allowedEmotes: settings.allowedEmotes });
    }
    // if it is already in the list, return 200 with current list
    return res
      .status(200)
      .json({ emote, allowedEmotes: settings.allowedEmotes });
  });

  // DELETE remove an emote from allowed list (supports query ?emote= or body.emote)
  app.delete("/settings/allowed-emotes", (req, res) => {
    const emote = req.query.emote;

    if (typeof emote !== "string" || emote.length === 0) {
      return res
        .status(400)
        .json({ error: "emote must be a string or not provided" });
    }

    // check if emote is in the list, if not return 404
    const idx = settings.allowedEmotes.indexOf(emote);
    if (idx === -1) return res.status(404).json({ error: "emote not found" });

    // remove the emote from the list
    settings.allowedEmotes.splice(idx, 1);
    return res
      .status(200)
      .json({ emote, allowedEmotes: settings.allowedEmotes });
  });

  // start the server
  app.listen(port, () =>
    console.log(`Analytics REST API listening on ${port}`),
  );

  return app;
}
