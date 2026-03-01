import React, { useEffect, useRef, useState } from "react";
import IntervalSettings from "./components/IntervalSettings";
import ThresholdSettings from "./components/ThresholdSettings";
import AllowedEmotes from "./components/AllowedEmotes";
import { EmoteFeed } from "./components/EmoteFeed";

export default function App() {
  return (
    <div>
      <h1>Emote Realtime</h1>
      <IntervalSettings />
      <ThresholdSettings />
      <AllowedEmotes />
      <EmoteFeed />
    </div>
  );
}
