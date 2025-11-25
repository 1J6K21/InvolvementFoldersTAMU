import type { Node } from "./types";

export function evaluateTree(node: Node, taken: string[]): Node {
  
  if (node.type === "single") {
    const normalizedCourse = node.course.replace("_", "").toUpperCase();
    const isMet = taken.some(t => t.replace("_", "").toUpperCase() === normalizedCourse);

    return {
      ...node,
      status: isMet ? "met" : "needed"
    };
  }

  const evaluatedChildren = node.children.map(child => evaluateTree(child, taken));

  let status: "met" | "needed";

  if (node.type === "and") {
    status = evaluatedChildren.every(c => c.status === "met") ? "met" : "needed";
  } else {
    status = evaluatedChildren.some(c => c.status === "met") ? "met" : "needed";
  }

  return {
    ...node,
    children: evaluatedChildren,
    status
  };
}
