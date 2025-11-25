export type NodeStatus = "met" | "unmet";

export interface SingleNode {
  type: "single";
  id: string;
  course: string;
  status?: NodeStatus;
}

export interface AndNode {
  type: "and";
  id: string;
  children: Node[];
  status?: NodeStatus;
}

export interface OrNode {
  type: "or";
  id: string;
  children: Node[];
  status?: NodeStatus;
}

export interface RootNode {
  type: "root";
  id: string;
  courseName: string;
  children: Node[];
  status?: NodeStatus;
}


export type Node = SingleNode | AndNode | OrNode;


export function evaluateNode(node: Node, taken: string[]): NodeStatus {
  if (node.type === "single") {
    return taken.includes(node.course) ? "met" : "unmet";
  }

  if (node.type === "and") {
    const allMet = node.children.every(child => evaluateNode(child, taken) === "met");
    return allMet ? "met" : "unmet";
  }

  if (node.type === "or") {
    const anyMet = node.children.some(child => evaluateNode(child, taken) === "met");
    return anyMet ? "met" : "unmet";
  }

  return "unmet";
}

function applyStatus(node: Node, taken: string[]): Node {
  const status = evaluateNode(node, taken);

  if (node.type === "single") return { ...node, status };

  return {
    ...node,
    status,
    children: node.children.map(child => applyStatus(child, taken))
  };
}

