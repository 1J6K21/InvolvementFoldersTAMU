export type SingleNode = { type: "single"; course: string };
export type OrNode = { type: "or"; children: Node[] };
export type AndNode = { type: "and"; children: Node[] };

export type Node = SingleNode | OrNode | AndNode;

export type RootNode = {
  type: "root";
  courseName: string;
  children: Node[];
};
