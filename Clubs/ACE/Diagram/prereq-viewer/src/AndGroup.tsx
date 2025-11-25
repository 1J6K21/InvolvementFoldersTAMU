// AndGroup.tsx
import React from "react";
import { GroupContainer } from "./GroupContainer";

export function AndGroup({ children }: { children: React.ReactNode }) {
  return <GroupContainer title="AND">{children}</GroupContainer>;
}
