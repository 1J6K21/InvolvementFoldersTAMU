// src/diagram_parser.ts
import type { Node } from "./types";

export function parsePrereqs(input: any): Node {
  if (!Array.isArray(input)) {
    // If it's a single course string
    if (typeof input === "string") return { type: "single", course: input };
    throw new Error("Unexpected prereq format");
  }

  // If the array contains ".", treat top-level as OR of segments
  if (input.includes(".")) {
    const segments: any[][] = [];
    let current: any[] = [];
    for (const item of input) {
      if (item === ".") {
        if (current.length > 0) {
          segments.push(current);
          current = [];
        }
      } else {
        current.push(item);
      }
    }
    if (current.length > 0) segments.push(current);

    // each segment becomes an AND group (or single)
    const children = segments.map((seg) => parseAndSegment(seg));
    // collapse single-child OR children if they are single nodes (still wrap in or)
    return { type: "or", children };
  }

  // no "." -> whole list is AND
  return parseAndSegment(input);
}

function parseAndSegment(arr: any[]): Node {
  const children: Node[] = arr.map(parseItem);
  if (children.length === 1) return children[0];
  return { type: "and", children };
}

function parseItem(item: any): Node {
  if (Array.isArray(item)) return parsePrereqs(item);
  if (typeof item === "string") return { type: "single", course: item };
  throw new Error("Invalid prereq item: " + JSON.stringify(item));
}
