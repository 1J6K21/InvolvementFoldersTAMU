import type { Node } from "../types";

// Assumes prereqs is your parsed JSON prereq array
export function parsePrereqs(prereqs: any[]): Node {
  if (!prereqs || prereqs.length === 0) return { course: "None" };

  // Example recursive parser (adapt this to your real JSON structure)
  const parseGroup = (group: any): Node => {
    if (group.type === "course") {
      return { course: group.code };
    }

    if (group.type === "AND" || group.type === "OR") {
      return {
        course: "", // parent placeholder
        operator: group.type,
        children: group.items.map((g: any) => parseGroup(g)),
      };
    }

    return { course: "Unknown" };
  };

  return parseGroup(prereqs[0]);
}