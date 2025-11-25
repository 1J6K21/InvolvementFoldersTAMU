// src/RenderNode.tsx
import React from "react";
import type { Node } from "./types";
import "./styles.css";

export function RenderNode({ node }: { node: Node }) {
  if (!node) return null;

  if (node.type === "single") {
    return (
      <div className="rn-single">
        <div className="rn-single-circle">{node.course}</div>
      </div>
    );
  }

  const label = node.type === "or" ? "OR" : "AND";

  return (
    <div className="rn-group">
      {/* box with top-center tab */}
      <div className={`rn-box rn-box-${node.type}`}>
        <div className="rn-tab">{label}</div>
        <div className="rn-children">
          {node.children.map((child, i) => (
            <div className="rn-child" key={i}>
              <RenderNode node={child} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
