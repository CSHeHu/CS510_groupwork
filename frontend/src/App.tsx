import React, { useEffect, useRef, useState } from "react";
import IntervalSettings from "./components/IntervalSettings";
import { EmoteFeed } from "./components/EmoteFeed";

export default function App() {
  return (
    <div>
      <h1>Emote Realtime</h1>
      <IntervalSettings />
      <EmoteFeed />
    </div>
  );
}
