// parser_with_grades.ts
// TypeScript prerequisite parser with grade qualifiers and nested AND/OR logic.
// Run with ts-node or compile with tsc.

type NodeType = "COURSE" | "AND" | "OR" | "NOT" | "CONCURRENT" | "CLASSIFICATION" | "ROOT";

interface Node {
  type: NodeType;
  // for COURSE nodes, value is course code; for CLASSIFICATION, value like "Senior"
  value?: string;
  // children for AND/OR/ROOT nodes
  children?: Node[];
  // metadata: require grade for this node/group
  requireGrade?: boolean;
  // allow marking concurrent flag per node if needed
  concurrent?: boolean;
}

function tokenize(text: string): string[] {
  // Capture useful tokens: course codes, words, punctuation, slashes, commas, semicolons, dots
  // Course pattern: 2-4 letters + space? + 3 digits
  const tokenRegex = /([A-Z]{2,4}\s?\d{3}|Grade of|grade of|concurrent enrollment|concurrent|not|no|or|and|\/|,|;|\.|Senior|Junior|Sophomore|Freshman|exam|[A-Za-z]+)/gi;
  const matches = text.match(tokenRegex) || [];
  // Normalize whitespace and case for key words; keep course codes uppercase
  return matches.map(tok => {
    const trimmed = tok.trim();
    if (/^[A-Z]{2,4}\s?\d{3}$/i.test(trimmed)) return trimmed.toUpperCase();
    return trimmed;
  });
}

// helper: detect "grade of ... in" pattern in original text for a segment
function segmentHasGrade(segment: string): boolean {
  return /grade\s+of\s+[A-F]?\s*|grade\s+of/i.test(segment) && /grade\s+of/i.test(segment);
}

// parse a single segment into a Node (AND/OR/Course tree)
function parseSegment(segment: string): Node {
  // Tokenize the segment with a lighter tokenizer that preserves or/and/commas/slashes
  const rawTokens = tokenize(segment);

  // Convert token list into a simpler token stream (only items we care about)
  // We'll treat commas as implicit AND separators unless 'or' present between them
  // Build tokens array of normalized tokens (course codes, or, and, /, classification, concurrent, exam, punctuation)
  const tokens: string[] = [];
  for (let i = 0; i < rawTokens.length; i++) {
    const t = rawTokens[i];
    const low = t.toLowerCase();
    if (low === "grade of") {
      // consume this token but represented by segmentHasGrade metadata (handled outside)
      continue;
    }
    if (["or", "and", "/", ",", ";", ".", "not", "no"].includes(low)) {
      tokens.push(low);
      continue;
    }
    if (/^[A-Z]{2,4}\s?\d{3}$/i.test(t)) {
      tokens.push(t); // course code
      continue;
    }
    if (["concurrent", "concurrent enrollment"].includes(low)) {
      tokens.push("concurrent");
      continue;
    }
    if (["senior", "junior", "sophomore", "freshman"].includes(t.toLowerCase())) {
      tokens.push(t.charAt(0).toUpperCase() + t.slice(1).toLowerCase());
      continue;
    }
    if (t.toLowerCase() === "exam") {
      tokens.push("EXAM");
      continue;
    }
    // ignore other filler words
  }

  // We'll parse with precedence: AND (higher) > OR (lower)
  let pos = 0;

  function peek(): string | null {
    return pos < tokens.length ? tokens[pos] : null;
  }
  function consume(): string | null {
    const tk = peek();
    if (tk !== null) pos++;
    return tk;
  }

  // Factor: course, classification, exam, or cross-list A/B (we handle slash at token level)
  function parseFactor(): Node {
    const tk = peek();
    if (!tk) return { type: "COURSE", value: "" }; // shouldn't happen
    if (tk === "EXAM") {
      consume();
      return { type: "COURSE", value: "EXAM" };
    }
    if (tk === "concurrent") {
      consume();
      // Following token likely a course or nothing; if course next we'll make a CONCURRENT node wrapping it
      const next = peek();
      if (next && /^[A-Z]{2,4}\s?\d{3}$/i.test(next)) {
        const courseTok = consume()!;
        return { type: "CONCURRENT", children: [{ type: "COURSE", value: courseTok }] };
      }
      return { type: "CONCURRENT" };
    }
    if (/^[A-Z]{2,4}\s?\d{3}$/i.test(tk)) {
      // course: but check if next token is '/' meaning cross-list
      const courseTok = consume()!;
      if (peek() === "/") {
        // parse sequence A / B possibly / C? we'll take A/B as OR children
        const courses = [courseTok];
        while (peek() === "/") {
          consume(); // skip '/'
          const nextCourse = consume();
          if (nextCourse && /^[A-Z]{2,4}\s?\d{3}$/i.test(nextCourse)) {
            courses.push(nextCourse);
          } else {
            break;
          }
        }
        // If only two courses, return OR node with COURSE children
        const childNodes = courses.map(c => ({ type: "COURSE", value: c } as Node));
        return { type: "OR", children: childNodes };
      } else {
        // simple course node
        return { type: "COURSE", value: courseTok };
      }
    }
    // classification token
    if (["Senior", "Junior", "Sophomore", "Freshman"].includes(tk)) {
      const v = consume()!;
      return { type: "CLASSIFICATION", value: v };
    }

    // fallback: consume and return as COURSE-like node
    const fallback = consume()!;
    return { type: "COURSE", value: fallback };
  }

  // Term: parse AND chains (comma treated as AND)
  function parseTerm(): Node {
    let left = parseFactor();

    while (true) {
      const tk = peek();
      if (!tk) break;
      if (tk === "and" || tk === ",") {
        consume(); // consume 'and' or comma
        const right = parseFactor();
        // combine left and right into AND node (flatten if needed)
        const children: Node[] = [];
        if (left.type === "AND" && left.children) children.push(...left.children);
        else children.push(left);
        if (right.type === "AND" && right.children) children.push(...right.children);
        else children.push(right);
        left = { type: "AND", children };
        continue;
      }
      // slash handled in factor
      break;
    }
    return left;
  }

  // Expression: parse OR chains (lowest precedence)
  function parseExpression(): Node {
    let left = parseTerm();

    while (true) {
      const tk = peek();
      if (!tk) break;
      if (tk === "or") {
        consume();
        const right = parseTerm();
        const children: Node[] = [];
        if (left.type === "OR" && left.children) children.push(...left.children);
        else children.push(left);
        if (right.type === "OR" && right.children) children.push(...right.children);
        else children.push(right);
        left = { type: "OR", children };
        continue;
      }
      break;
    }
    return left;
  }

  const expr = parseExpression();
  // If no tokens (empty), return empty ROOT child
  return expr;
}

// Top-level parser: split by semicolons/dots into segments, combine segments with AND, set requireGrade per segment
export function parsePrereqTextToTree(text: string): Node {
  // split by semicolons and dots, but keep segments in order
  const rawSegments = text.split(/;|\./).map(s => s.trim()).filter(Boolean);

  const children: Node[] = [];

  for (const seg of rawSegments) {
    // detect if this segment had a "grade of" qualifier
    const requireGrade = /grade\s+of/i.test(seg);

    // also detect if segment is 'concurrent enrollment in ...' or contains 'concurrent'
    const isConcurrentSegment = /concurrent/i.test(seg);

    // parse segment to subtree
    const subtree = parseSegment(seg);

    // attach requireGrade or concurrent metadata appropriately
    if (requireGrade) {
      // wrap subtree in a node that marks requireGrade
      const wrapper: Node = { type: subtree.type as NodeType, children: subtree.children, requireGrade: true };
      // If the subtree is a leaf course, put it into an OR with single child while preserving requireGrade
      if (!wrapper.children && subtree.value) {
        wrapper.children = [{ type: "COURSE", value: subtree.value }];
        delete wrapper.value;
      }
      children.push(wrapper);
    } else if (isConcurrentSegment) {
      // If segment is concurrent, ensure node type indicates concurrent: wrap under CONCURRENT node
      const wrapper: Node = { type: "CONCURRENT", children: subtree.children ?? (subtree.value ? [{ type: "COURSE", value: subtree.value }] : undefined) };
      children.push(wrapper);
    } else {
      // normal segment node as-is; ensure it's a child node
      if (subtree.type === "COURSE" && subtree.value && !subtree.children) {
        // keep as COURSE leaf
        children.push(subtree);
      } else {
        children.push(subtree);
      }
    }
  }

  // Combine top-level segments with AND (common catalog semantics: segments separated by semicolons must all be satisfied)
  if (children.length === 0) return { type: "ROOT", children: [] };
  if (children.length === 1) return { type: "ROOT", children: children };
  return { type: "ROOT", children: [{ type: "AND", children }] };
}

// Pretty-print tree (for debugging)
export function printNodeTree(node: Node, indent = 0): void {
  const pad = " ".repeat(indent);
  if (node.type === "COURSE") {
    console.log(`${pad}- COURSE: ${node.value}`);
    return;
  }
  if (node.type === "CLASSIFICATION") {
    console.log(`${pad}- CLASSIFICATION: ${node.value}`);
    return;
  }
  const meta = node.requireGrade ? " [requireGrade]" : node.concurrent ? " [concurrent]" : "";
  console.log(`${pad}- ${node.type}${meta}`);
  if (node.children) {
    for (const child of node.children) {
      printNodeTree(child, indent + 4);
    }
  }
}

// -------------------- TESTS --------------------
// Run tests when executed directly (ESM-compatible check)
if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  const tests: Record<string, string> = {
    "ECEN 403":
      "Prerequisites: Grade of C or better in COMM 205 or COMM 243 or ENGL 210; grade of C or better in ECEN 314, ECEN 325, and ECEN 350/CSCE 350 or CSCE 350/ECEN 350; grade of C or better in ECEN 303, ECEN 322, and ECEN 370, or grade C or better in CSCE 315 or CSCE 331, and ECEN 303 or STAT 211, and ECEN 449 or CSCE 462, or concurrent enrollment; senior classification.",
    "ACCT 210": "Prerequisite: ACCT 209 or ACCT 229."
  };

  for (const [course, text] of Object.entries(tests)) {
    console.log(`\n=== ${course} ===`);
    const tree = parsePrereqTextToTree(text);
    printNodeTree(tree);
  }
}
