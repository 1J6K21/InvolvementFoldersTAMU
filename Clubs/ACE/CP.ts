/**
 * Parses course prerequisite strings with AND/OR/NOT logic integrated into logical buckets.
 * Ported from Python to TypeScript by ChatGPT (2025).
 */
// -------------------------------
// Types
// -------------------------------

export interface BucketMap {
  [bucket: string]: Array<Record<string, string[]>>;
}

export interface DBNode {
  node_id: number;
  course_code?: string | null;
  node_type: string;
  value?: string | null;
  note?: string | null;
}

export interface DBEdge {
  parent_id: number;
  child_id: number;
  edge_type?: string;
}

export interface DBGraph {
  nodes: DBNode[];
  edges: DBEdge[];
  rootNodeId: number;
}

// -------------------------------
// ID generator
// -------------------------------
let nextId = 1;
const newId = () => nextId++;

// -------------------------------
// Graph builder
// -------------------------------

/**
 * Converts a parsed prerequisite bucket structure into graph nodes + edges.
 * @param courseCode The course being parsed (e.g., "STAT 211")
 * @param buckets Output of parsePrerequisites()
 */
export function buildPrereqGraph(courseCode: string, buckets: BucketMap): DBGraph {
  const nodes: DBNode[] = [];
  const edges: DBEdge[] = [];

  // Create the root node for this course
  const rootId = newId();
  nodes.push({
    node_id: rootId,
    node_type: "COURSE",
    course_code: courseCode,
    value: courseCode,
  });

  // Helper: recursively add groups and return their node_id
  const addGroup = (
    parentId: number,
    group: Record<string, string[]>,
    bucketType: string
  ): number => {
        const groupType = Object.keys(group)[0];
        const groupValues = group[groupType];
        const groupId = newId();

        // Insert a logical/group node (OR, AND, NOT, etc.)
        nodes.push({
        node_id: groupId,
        node_type: groupType.toUpperCase(),
        value: bucketType,
        });

        edges.push({ parent_id: parentId, child_id: groupId });

        // Now each item in the groupValues becomes a COURSE or sub-type node
        for (const val of groupValues) {
        const isCourse = /^[A-Z]{2,4}\s?\d{3}$/i.test(val);
        const nodeType = isCourse ? "COURSE" : bucketType.toUpperCase();

        const childId = newId();
        nodes.push({
            node_id: childId,
            node_type: nodeType,
            value: val,
        });

        edges.push({ parent_id: groupId, child_id: childId });
    }

    return groupId;
    };//end of addGroup()

    // -------------------------------
    // Build tree from parsed buckets
    // -------------------------------
    for (const [bucketType, groupList] of Object.entries(buckets)) {
        for (const group of groupList) {
        addGroup(rootId, group, bucketType);
        }
    }

    return { nodes, edges, rootNodeId: rootId };
}

// ------------------------------------------------------------------------------------------------------------------------------------------------------
type LogicGroup = { [key: string]: string[] }; //AND OR NOT ETC
type Buckets = {
    Pre: LogicGroup[];
    Concurrent: LogicGroup[];
    Cross: LogicGroup[];
    Classification: LogicGroup[];
};

export function parsePrerequisites(text: string): Buckets {
    // --- STEP 1: Tokenization ---
    const tokenPattern = /(Pre|Grade|or|and|\/|cross|concurrent|not|no|\.|;|exam|Senior|Junior|Sophomore|Freshman|[A-Z]{2,4}\s\d{3})/gi;
    const tokens = Array.from(text.matchAll(tokenPattern), m => m[0]);

    // Normalize capitalization (e.g., "math 142" → "MATH 142")
    const normalized: string[] = tokens.map(t => {
        return /^[A-Z]{2,4}\s\d{3}$/i.test(t) ? t.toUpperCase() : capitalize(t);
    });

    // --- STEP 2: Clean up Grade connectors ---
    const cleanTokens: string[] = [];
    let skipNext = false;
    for (let i = 0; i < normalized.length; i++) {
        const tok = normalized[i];
        if (skipNext) {
            skipNext = false;
            continue;
        }
        if (tok === "Grade") {
            const next = normalized[i + 1]?.toLowerCase();
            if (["or", "and", "/"].includes(next)) skipNext = true;
            continue;
        }
        cleanTokens.push(tok);
    }

    // --- STEP 3: Initialize buckets and state ---
    const buckets: Buckets = { Pre: [], Concurrent: [], Cross: [], Classification: [] };

    let currentBucket: keyof Buckets | null = null;
    let currentGroup: string[] = [];
    let logicOperator: string | null = null;
    let negativeMode = false;

    // --- Helper: Commit current group ---
    const commitGroup = (): void => {
        if (!currentBucket || currentGroup.length === 0) {
            currentGroup = [];
            negativeMode = false;
            return;
        }

        // Determine label
        let label = "OR";
        if (negativeMode) label = "NOT";
        else if (logicOperator === "and") label = "AND";

        // Handle course set merging (e.g., ECEN 350/CSCE 350)
        if (logicOperator === "/") {
            currentGroup = Array.from(new Set(currentGroup));
        }

        // Store into correct bucket
        buckets[currentBucket].push({ [label]: [...currentGroup] });

        // Reset temporary variables
        currentGroup = [];
        logicOperator = null;
        negativeMode = false;
    };

    // --- STEP 4: Parsing loop ---
    for (const tok of cleanTokens) {
        const tokLow = tok.toLowerCase();

        // Bucket triggers
        if (["Pre", "Concurrent", "Cross"].includes(tok)) {
            commitGroup();
            currentBucket =
                tok === "Pre" ? "Pre" : tok === "Concurrent" ? "Concurrent" : "Cross";
            continue;
        }

        // Logical connectors
        if (["and", "or", "/"].includes(tokLow)) {
            logicOperator = tokLow;
            continue;
        }

        // Negative logic
        if (["not", "no"].includes(tokLow)) {
            negativeMode = true;
            continue;
        }

        // Segment break
        if (tok === ";" || tok === ".") {
            commitGroup();
            currentBucket = null;
            logicOperator = null;
            negativeMode = false;
            continue;
        }

        // Classification handling
        if (["Senior", "Junior", "Sophomore", "Freshman"].includes(tok)) {
            if (!currentBucket) currentBucket = "Classification";
            currentGroup.push(tok);
            continue;
        }

        // Courses or exam
        if (/^(Exam|[A-Z]{2,4}\s\d{3})$/i.test(tok)) {
            if (!currentBucket) currentBucket = "Pre";
            currentGroup.push(tok);
            continue;
        }
    }

    // Commit the last group
    commitGroup();

    return buckets;
}

// Capitalize helper
function capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

// --- Tree printer ---
export function printTree(courseName: string, buckets: Buckets): void {
    console.log(`--- TREE VIEW: ${courseName} ---`);
    for (const [bucket, groups] of Object.entries(buckets)) {
        if (groups.length === 0) continue;
        console.log(`└──> [${bucket}]`);
        for (const group of groups) {
            for (const [label, values] of Object.entries(group)) {
                console.log(`    ├──> ${label} Group:`);
                for (const v of values) {
                    console.log(`    │       ${v}`);
                }
            }
        }
    }
    console.log();
}
//------------------------------------------------------------------------------------------------------------------------------------------------------
// --- TEST CASES ---
// Check if this is being run directly
if (import.meta.url === new URL(process.argv[1], 'file:').href) {
    // import { parsePrerequisites } from "./parser";
    // import { buildPrereqGraph } from "./prereqGraphBuilder";

    const text = "Prerequisite: Grade of C or better in MATH 142 and MATH 151; concurrent enrollment in CHEM 117/CSCE 677.";
    const buckets = parsePrerequisites(text);

    const graph = buildPrereqGraph("STAT 211", buckets);
    console.log(JSON.stringify(graph, null, 2));

    const tests: Record<string, string> = {
        "STAT 211": "Prerequisite: Grade of C or better in MATH 142, MATH 147, MATH 151, or MATH 171, or concurrent enrollment. Concurrent enrollment in CHEM 117; Cross Listing: ECEN 222/CSCE 222.",
        "STAT 202": "Prerequisite: Grade of B or better in STAT 201 and MATH 151, or concurrent enrollment in STAT 202.",
        "CHEM 107": "Prerequisite: CHEM 107 or CHEM 101 and CHEM 117; Cross Listing: BIOL 107/BIOT 107.",
        "MATH 309": "Prerequisites: MATH 221, MATH 251, or MATH 253; MATH 308 or concurrent enrollment; junior or senior classification or approval of instructor.",
        "CSCE 350": "Prerequisites: Grade of C or better in ECEN 248 and CSCE 120; junior or senior classification. Cross Listing: ECEN 350/CSCE 350.",
        "MATH 142": "Prerequisites: Grade of C or better in MATH 140 or MATH 150, or equivalent or acceptable score on Texas A&M University math placement exam; not open to senior classification; also taught at Galveston campus.",
        "MATH 000": "Prerequisites: No use of MATH 001; exam; no seniors",
        "CSCE 313": "Prerequisite: CSCE 221 with a grade of C or better; grade of C or better in CSCE 312 or concurrent enrollment in CSCE 350/ECEN 350 or ECEN 350/CSCE 350."
    };

    for (const [course, text] of Object.entries(tests)) {
        const buckets = parsePrerequisites(text);
        printTree(course, buckets);
    }


    /*



            // Example pseudo-insert (using node-postgres)
        import { Pool } from "pg";
        const pool = new Pool();

        async function insertGraph(graph: DBGraph) {
        for (const node of graph.nodes) {
            await pool.query(
            `INSERT INTO prereq_nodes (node_id, course_code, node_type, value)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (node_id) DO NOTHING`,
            [node.node_id, node.course_code, node.node_type, node.value]
            );
        }

        for (const edge of graph.edges) {
            await pool.query(
            `INSERT INTO prereq_edges (parent_id, child_id, edge_type)
            VALUES ($1, $2, $3)
            ON CONFLICT DO NOTHING`,
            [edge.parent_id, edge.child_id, edge.edge_type || "CONTAINS"]
            );
        }

        await pool.query(
            `INSERT INTO prereq_roots (course_code, root_node_id)
            VALUES ($1, $2)
            ON CONFLICT (course_code) DO UPDATE SET root_node_id = EXCLUDED.root_node_id`,
            [graph.nodes[0].course_code, graph.rootNodeId]
        );
        }


    */
}
