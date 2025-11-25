import { useEffect, useState } from "react";
import { RenderNode } from "./RenderNode";
import { parsePrereqs } from "./diagram_parser";
import type { RootNode } from "./types";

export default function App() {
  const [root, setRoot] = useState<RootNode | null>(null);

  useEffect(() => {
    fetch("/public/data_Spring2026_Prereq_test.json")
      .then((r) => r.json())
      .then((json) => {
        const prereqs = json["ECEN_403"].info.prereqs;
        const parsed = parsePrereqs(prereqs);

        setRoot({
          type: "root",
          courseName: "ECEN_403",
          children: parsed.type === "single" ? [parsed] : parsed.children,
        });
      });
  }, []);

  if (!root) return <div>Loading...</div>;

  return (
    <div className="p-10 flex justify-center">
      <RenderNode node={root} />
    </div>
  );
}
