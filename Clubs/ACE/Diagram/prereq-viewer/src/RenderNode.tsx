import React from "react";
import type { Node, RootNode } from "./types";
import "./styles.css";

type Props = {
  node: Node | RootNode;
};

export function RenderNode({ node }: Props) {
  // ROOT NODE ---------------------------
  if (node.type === "root") {
    return (
      <div className="node-container">
        <div className="circle-node">{node.courseName}</div>

        {/* branch lines only for root */}
        {node.children.length > 0 && (
          <div className="root-branch-container">
            <div className="root-vertical" />
            <div className="root-horizontal" />

            <div style={{ display: "flex", justifyContent: "center", gap: "30px" }}>
              {node.children.map((child, i) => (
                <div key={i} className="root-child">
                  <div className="child-vertical" />
                  <RenderNode node={child} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // SINGLE NODE ---------------------------
  if (node.type === "single") {
    return (
      <div className="node-container">
        <div className="circle-node">{
            node.course
            .replace(/ (?:(\w)|\^)/g, (_, letter) => {
          if (letter) {
            return `\n| Pass Grade: ${letter} |`;
          }
          return "\n| or Concurrent |";
        })
          }</div>
      </div>
    );
  }

  // GROUP NODES (AND / OR) --------------
  const label = node.type === "and" ? "AND" : "OR";

  return (
    <div className="node-container">
      <div className="group-box">
        <div className="group-label">{label}</div>
        <div className="group-content">
          {node.children.map((child, i) => (
            <RenderNode key={i} node={child} />
          ))}
        </div>
      </div>
    </div>
  );
}
