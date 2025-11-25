// GroupContainer.tsx
import React from "react";

export function GroupContainer({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative border-2 border-gray-700 rounded-lg p-4 pt-8 bg-white inline-block">
      {/* Title (cut-out effect) */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-2 font-bold text-sm">
        {title}
      </div>

      <div className="flex gap-4 flex-wrap justify-center items-center">
        {children}
      </div>
    </div>
  );
}
