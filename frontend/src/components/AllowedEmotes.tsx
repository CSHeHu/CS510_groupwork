/**
 * AllowedEmotes component
 *
 * UI for viewing and managing the analytics `allowed-emotes` list.
 * Supports listing, adding, removing, and replacing the full list.
 *
 * AI usage declaration: GitHub Copilot - GPT-5 mini model was used to create
 * comments and docstrings in this file. AI was also used to help implement
 * the network interactions and component structure.
 */
import React, { useEffect, useState } from "react";
export default function AllowedEmotes() {
  const [allowed, setAllowed] = useState<string[]>([]);
  const [newEmote, setNewEmote] = useState<string>("");

  const fetchAllowed = async () => {
    try {
      const res = await fetch("/api/settings/allowed-emotes");
      if (!res.ok) throw new Error(`status ${res.status}`);
      const body = await res.json();
      setAllowed(Array.isArray(body.allowedEmotes) ? body.allowedEmotes : []);
    } catch (err) {
      console.warn("failed to fetch allowed emotes", err);
    }
  };

  const addEmote = async () => {
    try {
      const emote = newEmote.trim();
      if (!emote) return;
      const res = await fetch("/api/settings/allowed-emotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emote }),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const body = await res.json();
      setAllowed(body.allowedEmotes || []);
      setNewEmote("");
    } catch (err) {
      console.warn("failed to add emote", err);
      alert("Failed to add emote");
    }
  };

  const removeEmote = async (emote: string) => {
    try {
      const url = `/api/settings/allowed-emotes?emote=${encodeURIComponent(emote)}`;
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) {
        if (res.status === 404) return alert("Emote not found");
        throw new Error(`status ${res.status}`);
      }
      const body = await res.json();
      setAllowed(body.allowedEmotes || []);
    } catch (err) {
      console.warn("failed to remove emote", err);
      alert("Failed to remove emote");
    }
  };

  useEffect(() => {
    fetchAllowed();
  }, []);

  return (
    <div>
      <h2>Analytics Settings — Allowed Emotes</h2>

      <div>
        <strong>Current:</strong>
        <div>
          {allowed.length === 0 ? (
            <span>no emotes</span>
          ) : (
            allowed.map((e) => (
              <div key={e}>
                <span>{e}</span>
                <button onClick={() => removeEmote(e)}>remove</button>
              </div>
            ))
          )}
        </div>
      </div>

      <div>
        <input value={newEmote} onChange={(e) => setNewEmote(e.target.value)} />
        <button onClick={addEmote}>Add</button>
        <button onClick={fetchAllowed}>Refresh</button>
      </div>
    </div>
  );
}
