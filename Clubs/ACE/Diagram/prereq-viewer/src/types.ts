// src/types.ts
// A single course can also hold optional children (so the root single course can branch).
export type SingleNode = {
  type: "single";
  course: string;
  children?: Node[]; // optional so root single can have branches
};

export type OrNode = {
  type: "or";
  children: Node[];
};

export type AndNode = {
  type: "and";
  children: Node[];
};

export type Node = SingleNode | OrNode | AndNode;
