import { parsePrereq, prereqchecker, evaluateSingleRequirement } from "./prereqchecker";
import * as fs from "fs";


type NodeStatus = "met" | "inprogress" | "missing" | "group";
interface PrereqNode {
    label: string;
    status: NodeStatus;
    children?: PrereqNode[];
    operator?: "AND" | "OR";
}

function analyzeBucket(
    bucket: PrereqBucket,
    coursesTaken: string[],
    coursesEnrolled: string[]
): PrereqNode {
    if (typeof bucket === "string") {
        if (bucket === ".") {
            return { label: ".", status: "group", operator: "OR" };
        }

        const result = evaluateSingleRequirement(coursesTaken, coursesEnrolled, bucket);
        const courseMatch = bucket.match(/^([A-Z]{4}\d{3})/);
        const label = courseMatch ? courseMatch[1] : bucket;

        let status: NodeStatus;
        if (result === true) status = "met";
        else if (coursesEnrolled.some(e => e.startsWith(label))) status = "inprogress";
        else status = "missing";

        return { label, status };
    }

    if (Array.isArray(bucket)) {
        const children = bucket.map(b => analyzeBucket(b, coursesTaken, coursesEnrolled));

        const operator = bucket.includes(".") ? "OR" : "AND";
        return {
            label: operator,
            status: "group",
            operator,
            children
        };
    }

    return { label: "?", status: "missing" };
}


function toGraphviz(node: PrereqNode, parentId?: string, counter = { i: 0 }): string {
    const id = `n${counter.i++}`;
    const color =
        node.status === "met" ? "green" :
        node.status === "inprogress" ? "gold" :
        node.status === "missing" ? "red" : "black";

    let dot = `${id} [label="${node.label}", color="${color}", fontcolor="${color}"];\n`;

    if (parentId) {
        dot += `${parentId} -> ${id};\n`;
    }

    if (node.children) {
        for (const child of node.children) {
            dot += toGraphviz(child, id, counter);
        }
    }

    return dot;
}

function bucketToGraphviz(root: PrereqNode): string {
    return `digraph prereqs {
    node [shape=box, style="rounded"];
${toGraphviz(root)}
}`;
}

function toMermaid(node: PrereqNode, parentId?: string, counter = { i: 0 }): string {
    const id = `n${counter.i++}`;
    const color =
        node.status === "met" ? "green" :
        node.status === "inprogress" ? "orange" :
        node.status === "missing" ? "red" : "black";

    let out = `${id}["${node.label}":::${color}]\n`;
    if (parentId) out += `${parentId} --> ${id}\n`;

    if (node.children) {
        for (const c of node.children) out += toMermaid(c, id, counter);
    }

    return out;
}

function bucketToMermaid(root: PrereqNode): string {
    return `flowchart TD\n${toMermaid(root)}\nclassDef green fill:#a3f7a3;\nclassDef orange fill:#ffd966;\nclassDef red fill:#f99;\n`;
}


const analyzed = analyzeBucket(csce421, coursesTaken, coursesEnrolled);
const dot = bucketToGraphviz(analyzed);
fs.writeFileSync("csce421.dot", dot);
console.log("Graph written to csce421.dot");

