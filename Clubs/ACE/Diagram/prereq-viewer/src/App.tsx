// src/App.tsx
import React, { useEffect, useState } from "react";
import { parsePrereqs } from "./diagram_parser";
import { RenderNode } from "./RenderNode";
import type { Node } from "./types";
import "./styles.css";

export default function App() {
  const [root, setRoot] = useState<Node | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        // fetch file placed in public/
        const res = await fetch("/data_Spring2026_Prereq_test.json"); // rename file to this in public/
        if (!res.ok) throw new Error("Failed to load prereq file");
        const json = await res.json();

        // extract prereqs for course (same logic you used before)
        const courseName = "CSCE_120";
        const classBucket = json[courseName];
        const prereqs = classBucket?.info?.prereqs ?? [];

        const parsed = parsePrereqs(prereqs);
        setRoot(parsed);
      } catch (e) {
        console.error("Error loading prereqs", e);
        setRoot(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div className="p-8">Loading…</div>;
  if (!root) return <div className="p-8">No prereqs found or load failed.</div>;

  return (
    <div className="p-8 flex justify-center">
      <RenderNode node={root} />
    </div>
  );
}
