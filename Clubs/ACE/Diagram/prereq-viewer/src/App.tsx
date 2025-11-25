// src/App.tsx
import React, { useEffect, useState } from "react";
import { parsePrereqsList } from "./diagram_parser";
import { RenderNode } from "./RenderNode";
import type { Node, SingleNode } from "./types";
import "./styles.css";

export default function App() {
  const [root, setRoot] = useState<Node | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/data_Spring2026_Prereq_test.json");
        if (!res.ok) throw new Error("Failed to load prereq file");
        const json = await res.json();

        const courseName = "ECEN_403";
        const classBucket = json[courseName];
        const prereqs = classBucket?.info?.prereqs ?? [];

        // parse into Node[] branches
        const children = parsePrereqsList(prereqs);

        // create a SingleNode root that *has* children
        const rootNode: SingleNode = {
          type: "single",
          course: courseName,
          children, // optional field we added in types
        };

        setRoot(rootNode);
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
