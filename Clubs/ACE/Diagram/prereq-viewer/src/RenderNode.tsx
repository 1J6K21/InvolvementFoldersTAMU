// src/RenderNode.tsx
import React from "react";
import type { Node } from "./types";
import "./styles.css";

export function RenderNode({ node }: { node: Node }) {
  // narrow by discriminant 'type'
  if (node.type === "single") {
    return (
      <div className="node-container">
        <div className="single-course">{
        node.course
        .replace(/ (?:(\w)|\^)/g, (_, letter) => {
          if (letter) {
            return ` | Pass Grade: ${letter}`;
          }
          return " | or Concurrent";
        })
          }</div>

        {node.children && node.children.length > 0 && (
          <div className="branches">
            {node.children.map((child, i) => (
              <div key={i} className="branch">
                <RenderNode node={child} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // node is or/and here
  const label = node.type === "or" ? "OR" : "AND";

  return (
    <div className="group-box">
      <div className="group-label">{label}</div>
      <div className="group-content">
        {node.children.map((child, i) => (
          <div key={i}>
            <RenderNode node={child} />
          </div>
        ))}
      </div>
    </div>
  );
}
