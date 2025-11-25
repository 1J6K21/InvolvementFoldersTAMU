// OrGroup.tsx
import React from "react";
import { GroupContainer } from "./GroupContainer";

export function OrGroup({ children }: { children: React.ReactNode }) {
  return <GroupContainer title="OR">{children}</GroupContainer>;
}
