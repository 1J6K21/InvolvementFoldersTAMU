export type SingleNode = {
  type: "single";
  course: string;
  status?: "met" | "needed";
};

export type OrNode = {
  type: "or";
  children: Node[];
  status?: "met" | "needed";
};

export type AndNode = {
  type: "and";
  children: Node[];
  status?: "met" | "needed";
};

export type Node = SingleNode | OrNode | AndNode;
