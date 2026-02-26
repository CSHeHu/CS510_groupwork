/**
 * ThresholdSettings
 *
 * Component for viewing and updating the analytics threshold value.
 * Uses GET `/api/settings/threshold` and PUT `/api/settings/threshold`.
 *
 * AI usage declaration: GitHub Copilot - GPT-5 mini model was used to create
 * comments and docstrings in this file. AI was also used to help implementing the state control of React.
 * AI also helped on typescript type definitions.
 */
import React, { useEffect, useState } from "react";

export default function ThresholdSettings() {
  const [threshold, setThreshold] = useState<number | null>(null);
  const [input, setInput] = useState<string>("");

  const fetchThreshold = async () => {
    try {
      const res = await fetch("/api/settings/threshold");
      if (!res.ok) throw new Error(`status ${res.status}`);
      const body = await res.json();
      setThreshold(body.threshold);
      setInput(String(body.threshold));
    } catch (err) {
      console.warn("failed to fetch threshold", err);
    }
  };

  const saveThreshold = async () => {
    try {
      const v = Number(input);
      if (!Number.isFinite(v)) return alert("Threshold must be a number");
      const res = await fetch("/api/settings/threshold", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threshold: v }),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const body = await res.json();
      setThreshold(body.threshold);
      setInput(String(body.threshold));
    } catch (err) {
      console.warn("failed to save threshold", err);
      alert("Failed to save threshold");
    }
  };

  useEffect(() => {
    fetchThreshold();
  }, []);

  return (
    <div>
      <h2>Analytics Settings — Threshold</h2>
      <p>Significance threshold</p>
      <div>
        <input
          type="number"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button onClick={saveThreshold}>Save</button>
        <div>Current: {threshold === null ? "loading..." : threshold}</div>
      </div>
    </div>
  );
}
