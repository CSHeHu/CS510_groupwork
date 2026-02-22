import React, { useEffect, useRef, useState } from "react";
import IntervalSettings from "./components/IntervalSettings";

type AggregatedMoment = {
  minute: string;
  moments: Array<any>;
  generatedAt: string;
};

const WS_URL = "/ws/";

export default function App() {
  const [messages, setMessages] = useState<AggregatedMoment[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;
    ws.onopen = () => console.log("WS open", WS_URL);
    ws.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        setMessages((s) => [payload, ...s].slice(0, 50));
      } catch (err) {
        console.warn("failed to parse ws message", err);
      }
    };
    ws.onclose = () => console.log("WS closed");
    ws.onerror = (e) => console.warn("WS error", e);
    return () => ws.close();
  }, []);

  return (
    <div>
      <h1>Emote Realtime</h1>

      <IntervalSettings />

      <div>
        <h2>Realtime Feed:</h2>
        <ul>
          {messages.map((m, i) => (
            <li key={i}>
              <strong>{m.minute}</strong> — {JSON.stringify(m.moments)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
