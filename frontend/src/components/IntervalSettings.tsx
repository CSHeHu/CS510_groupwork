/**
 * IntervalSettings component allows users to view and update the interval settings
 *
 * The interval setting determines how many messages the server will collect before running analysis.
 * Component fetches the current interval from the API on mount, displays it to the user,
 * and provides an input field and buttons to update or refresh the interval setting. When the user
 * saves a new interval, it sends a PUT request to the server to update the setting *
 *
 * AI usage declaration: GitHub Copilot - GPT-5 mini model was used to create
 * comments and docstrings in this file. AI was also used to help implementing the state control of React.
 * AI also helped on typescript type definitions.
 *
 */

import React, { useEffect, useState } from "react";

export default function IntervalSettings() {
  const [interval, setInterval] = useState<number | null>(null);
  const [intervalInput, setIntervalInput] = useState<string>("");

  const fetchInterval = async () => {
    try {
      const res = await fetch("/api/settings/interval");
      if (!res.ok) throw new Error(`status ${res.status}`);
      const body = await res.json();
      setInterval(body.interval);
      setIntervalInput(String(body.interval));
    } catch (err) {
      console.warn("failed to fetch interval", err);
    }
  };

  const saveInterval = async () => {
    try {
      const v = Number(intervalInput);
      if (v <= 0) return alert("Interval must be a positive number");
      const res = await fetch("/api/settings/interval", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interval: v }),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const body = await res.json();
      setInterval(body.interval);
      setIntervalInput(String(body.interval));
    } catch (err) {
      console.warn("failed to save interval", err);
      alert("Failed to save interval");
    }
  };

  useEffect(() => {
    fetchInterval();
  }, []);

  return (
    <div>
      <h2>Analytics Settings — Interval</h2>
      <div>
        <input
          type="number"
          value={intervalInput}
          onChange={(e) => setIntervalInput(e.target.value)}
        />
        <button onClick={saveInterval}>Save</button>
        <button onClick={fetchInterval}>Refresh</button>
        <div>Current: {interval === null ? "loading..." : interval}</div>
      </div>
    </div>
  );
}
