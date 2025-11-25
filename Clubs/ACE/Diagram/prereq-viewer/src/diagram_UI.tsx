// import { parsePrereqs } from "./diagram_parser";
// import { RenderNode } from "./RenderNode";

// const data = ["a", "b", "c", ".", "d"];

// export default function App() {
//   const root = parsePrereqs(data);

//   return (
//     <div className="p-8">
//       <RenderNode node={root} />
//     </div>
//   );
// }


// export function SingleGroup({ course }: { course: string }) {
//   return (
//     <div className="flex items-center justify-center w-20 h-20 rounded-full border-2 border-gray-700 bg-white text-center text-sm font-semibold">
//       {course}
//     </div>
//   );
// }

// export function GroupContainer({
//   title,
//   children,
// }: {
//   title: string;
//   children: React.ReactNode;
// }) {
//   return (
//     <div className="relative border-2 border-gray-700 rounded-lg p-4 pt-8 bg-white inline-block">
//       {/* Title (cut-out effect) */}
//       <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-2 font-bold text-sm">
//         {title}
//       </div>

//       <div className="flex gap-4 flex-wrap justify-center">{children}</div>
//     </div>
//   );
// }

// export function OrGroup({ children }: { children: React.ReactNode }) {
//   return <GroupContainer title="OR">{children}</GroupContainer>;
// }

// export function AndGroup({ children }: { children: React.ReactNode }) {
//   return <GroupContainer title="AND">{children}</GroupContainer>;
// }

// import { Node } from "./types";
// import { SingleGroup } from "./SingleGroup";
// import { OrGroup } from "./OrGroup";
// import { AndGroup } from "./AndGroup";

// export function RenderNode({ node }: { node: Node }) {
//   switch (node.type) {
//     case "single":
//       return <SingleGroup course={node.course} />;

//     case "or":
//       return (
//         <OrGroup>
//           {node.children.map((c, i) => (
//             <RenderNode key={i} node={c} />
//           ))}
//         </OrGroup>
//       );

//     case "and":
//       return (
//         <AndGroup>
//           {node.children.map((c, i) => (
//             <RenderNode key={i} node={c} />
//           ))}
//         </AndGroup>
//       );
//   }
// }
