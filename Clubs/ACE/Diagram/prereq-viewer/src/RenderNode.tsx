import React from "react";
import type { Node, RootNode } from "./types";
import "./styles.css";

type Props = {
  node: Node | RootNode;
};

export function RenderNode({ node }: Props) {
  // ===================================================
  // ROOT NODE — correct horizontal layout restored
  // ===================================================
  if (node.type === "root") {
    return (
      <div className="node-container">
        {/* Root circle */}
        <div className={`circle-node ${node.status ?? ""}`}>
          {node.courseName}
        </div>

        {/* Children below root */}
        {node.children.length > 0 && (
          <div className="root-branch-container">
            {/* Vertical line under root */}
            <div className="root-vertical" />

            {/* Horizontal line that children connect to */}
            <div className="root-horizontal" />

            {/* CHILDREN ROW */}
            <div className="root-children-row">
              {node.children.map((child, i) => (
                <div key={i} className="root-child">
                  {/* Each child gets a small vertical line */}
                  <div className="child-vertical" />

                  {/* Render subtree */}
                  <RenderNode node={child} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ===================================================
  // SINGLE COURSE NODE (circle)
  // ===================================================
  if (node.type === "single") {
    const formatted = node.course.replace(/ (?:(\w)|\^)/g, (_, letter) => {
      if (letter) return `\n| Pass Grade: ${letter} |`;
      return "\n| or Concurrent |";
    });

    return (
      <div className="node-container">
        <div className={`circle-node ${node.status ?? ""}`}>
          {formatted}
        </div>
      </div>
    );
  }

  // ===================================================
  // GROUP NODE (AND / OR) — vertical layout restored
  // ===================================================
  const label = node.type === "and" ? "AND" : "OR";

  return (
    <div className="node-container">
      <div className={`group-box ${node.status ?? ""}`}>
        <div className="group-label">{label}</div>

        {/* This is important: vertical stacking */}
        <div className="group-content">
          {node.children.map((child, i) => (
            <RenderNode key={i} node={child} />
          ))}
        </div>
      </div>
    </div>
  );
}
