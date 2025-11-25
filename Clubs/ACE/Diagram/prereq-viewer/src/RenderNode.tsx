import type { Node } from "./types";

export function RenderNode({ node }: { node: Node }) {
  if (node.type === "single") {
    return (
      <div className={`circle-node ${node.status}`}>
        {node.course}
      </div>
    );
  }

  return (
    <div className={`group-box ${node.status}`}>
      <div className="group-label">{node.type.toUpperCase()}</div>
      <div className="group-content">
        {node.children.map((c, i) => (
          <RenderNode key={i} node={c} />
        ))}
      </div>
    </div>
  );
}
