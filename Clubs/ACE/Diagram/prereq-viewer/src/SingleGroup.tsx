// SingleGroup.tsx

export function SingleGroup({ course }: { course: string }) {
  return (
    <div className="flex items-center justify-center w-20 h-20 rounded-full border-2 border-gray-700 bg-white text-center text-sm font-semibold">
      {
        course.replace(/ (?:(\w)|\^)/g, (_, letter) => {
          if (letter) {
            return ` Pass Grade: ${letter}`;
          }
          return " or Concurrent";
        })

      }
    </div>
  );
}
