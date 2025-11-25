import { useEffect, useState } from "react";
import { parsePrereqs } from "./diagram_parser";
import { evaluateTree } from "./evaluateTree";
import { RenderNode } from "./RenderNode";
import type { Node, RootNode } from "./types";

export default function App() {
  const [root, setRoot] = useState<Node | null>(null);

  useEffect(() => {
    async function load() {
      const prereqJson = await fetch("/data_Spring2026_Prereq_test.json").then(
        (r) => r.json()
      );
      const takenJson = await fetch("/coursesTaken.json").then((r) => r.json());

      const prereqs = prereqJson["ECEN_403"].info.prereqs;

      const parsedTree = parsePrereqs(prereqs);
      const evaluated = evaluateTree(parsedTree, takenJson.taken);
      const childrenToUse =
        evaluated.type === "and" ? evaluated.children : [evaluated];

      const rootWrapped: RootNode = {
        type: "root",
        id: "root-" + (evaluated.id ?? "0"),
        courseName: "ECEN 403",
        status: evaluated.status,
        children: childrenToUse,
      };

      setRoot(rootWrapped);
    }

    load();
  }, []);

  if (!root) return <div>Loading...</div>;

  return (
    <div className="p-8">
      <RenderNode node={root} />
    </div>
  );
}
