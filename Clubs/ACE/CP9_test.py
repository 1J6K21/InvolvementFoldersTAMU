
import re
from typing import List, Optional, Dict, Any

# --- Node definition ---
class Node:
    def __init__(self, node_type: str, value: Optional[str] = None, children: Optional[List['Node']] = None, require_grade: bool = False):
        self.type = node_type  # "COURSE", "AND", "OR", "CONCURRENT", "CLASSIFICATION", "ROOT"
        self.value = value
        self.children = children or []
        self.require_grade = require_grade

    def __repr__(self):
        if self.type == "COURSE":
            return f"COURSE({self.value})"
        meta = " [GRADE]" if self.require_grade else ""
        return f"{self.type}{meta}({self.children})"


# --- Tokenizer ---
def tokenize_segment(segment: str) -> List[str]:
    token_regex = r"([A-Z]{2,4}\s?\d{3}|/|,|;|\.|or\b|and\b|concurrent\b|grade\s+of\b|not\b|no\b|senior\b|junior\b|sophomore\b|freshman\b|exam\b)"
    tokens = re.findall(token_regex, segment, flags=re.IGNORECASE)
    cleaned = []
    for t in tokens:
        t = t.strip()
        if not t:
            continue
        # normalize
        if re.match(r"^[A-Z]{2,4}\s?\d{3}$", t, re.IGNORECASE):
            cleaned.append(t.upper())
        else:
            cleaned.append(t.lower())
    return cleaned

# --- Parser for a single segment (correct precedence) ---
def parse_segment_to_node(segment: str) -> Node:
    tokens = tokenize_segment(segment)
    # print("TOKENS:", tokens)  # debug if needed
    pos = 0

    def peek() -> Optional[str]:
        return tokens[pos] if pos < len(tokens) else None

    def consume() -> Optional[str]:
        nonlocal pos
        t = peek()
        if t is not None:
            pos += 1
        return t

    # Factor: course, cross-list (A/B), classification, exam, concurrent
    def parse_factor() -> Node:
        tk = peek()
        if tk is None:
            return Node("COURSE", value="")  # fallback
        # concurrent prefix
        if tk == "concurrent":
            consume()
            # next likely a course
            next_t = peek()
            if next_t and re.match(r"^[A-Z]{2,4}\s?\d{3}$", next_t, re.IGNORECASE):
                course_tok = consume()
                return Node("CONCURRENT", children=[Node("COURSE", value=course_tok)])
            return Node("CONCURRENT")
        # course (may be cross-list joined by /)
        if re.match(r"^[A-Z]{2,4}\s?\d{3}$", tk, re.IGNORECASE):
            course_tok = consume()
            # if next token is '/', collect cross-list chain
            if peek() == "/":
                courses = [course_tok]
                while peek() == "/":
                    consume()  # skip '/'
                    next_course = peek()
                    if next_course and re.match(r"^[A-Z]{2,4}\s?\d{3}$", next_course, re.IGNORECASE):
                        courses.append(consume())
                    else:
                        break
                # cross-list is an OR node of the course codes
                or_children = [Node("COURSE", value=c) for c in courses]
                return Node("OR", children=or_children)
            else:
                return Node("COURSE", value=course_tok)
        # classification or exam as leaf
        if tk in ("senior", "junior", "sophomore", "freshman"):
            val = consume().capitalize()
            return Node("CLASSIFICATION", value=val)
        if tk == "exam":
            consume()
            return Node("COURSE", value="EXAM")
        # unknown token: consume and treat as COURSE-like fallback
        fallback = consume()
        return Node("COURSE", value=fallback)

    # Term: series of factors joined by AND (commas are treated as AND)
    def parse_term() -> Node:
        left = parse_factor()
        parts = [left]
        while True:
            tk = peek()
            if tk is None:
                break
            if tk in ("and", ","):
                consume()
                right = parse_factor()
                parts.append(right)
                continue
            # if slash handled in factor
            break
        if len(parts) == 1:
            return parts[0]
        return Node("AND", children=parts)

    # Expression: terms joined by OR (lowest precedence)
    def parse_expression() -> Node:
        left = parse_term()
        parts = [left]
        while True:
            tk = peek()
            if tk is None:
                break
            if tk == "or":
                consume()
                right = parse_term()
                parts.append(right)
                continue
            break
        if len(parts) == 1:
            return parts[0]
        return Node("OR", children=parts)

    root = parse_expression()
    return root

# --- Top-level: split by semicolons/dots, attach grade metadata per segment ---
def parse_text_to_tree(text: str) -> Node:
    # split into segments by semicolon or dot (keep order)
    raw_segments = [s.strip() for s in re.split(r"[;\.]", text) if s.strip()]
    children: List[Node] = []

    for seg in raw_segments:
        seg_lower = seg.lower()
        requires_grade = bool(re.search(r"grade\s+of", seg_lower))
        # parse the segment into a subtree
        subtree = parse_segment_to_node(seg)
        if requires_grade:
            # mark the subtree (wrap if necessary)
            subtree.require_grade = True
        # treat segments that are explicit "concurrent" differently if top-level
        if re.search(r"\bconcurrent\b", seg_lower) and subtree.type != "CONCURRENT":
            # wrap in a CONCURRENT node
            wrapper = Node("CONCURRENT", children=[subtree])
            children.append(wrapper)
        else:
            children.append(subtree)

    if not children:
        return Node("ROOT", children=[])
    if len(children) == 1:
        return Node("ROOT", children=children)
    # top-level: segments separated by ';' are ANDed
    return Node("ROOT", children=[Node("AND", children=children)])

# --- Pretty print ---
def print_tree(node: Node, indent: int = 0):
    pad = " " * indent
    meta = " [GRADE]" if node.require_grade else ""
    if node.type == "COURSE":
        print(f"{pad}- COURSE: {node.value}{meta}")
        return
    if node.type == "CLASSIFICATION":
        print(f"{pad}- CLASSIFICATION: {node.value}{meta}")
        return
    print(f"{pad}- {node.type}{meta}")
    for c in node.children:
        print_tree(c, indent + 4)

# --- Test cases ---
if __name__ == "__main__":
    tests = {
        "ECEN 403": "Prerequisites: Grade of C or better in COMM 205 or COMM 243 or ENGL 210; grade of C or better in ECEN 314, ECEN 325, and ECEN 350/CSCE 350 or CSCE 350/ECEN 350; grade of C or better in ECEN 303, ECEN 322, and ECEN 370, or grade C or better in CSCE 315 or CSCE 331, and ECEN 303 or STAT 211, and ECEN 449 or CSCE 462, or concurrent enrollment; senior classification.",
        "ACCT 210": "Prerequisite: ACCT 209 or ACCT 229."
    }

    for course, text in tests.items():
        print(f"\n=== {course} ===")
        tree = parse_text_to_tree(text)
        print_tree(tree)

def parse_prerequisites(text: str):
    token_pattern = r"(Pre|Grade|or|and|/|cross|concurrent|not|no|\.|;|exam|Senior|Junior|Sophomore|Freshman|[A-Z]{2,4}\s\d{3})"
    tokens = re.findall(token_pattern, text, flags=re.IGNORECASE)

    # Normalize tokens
    normalized = []
    for t in tokens:
        if re.match(r"[A-Z]{2,4}\s\d{3}", t, re.IGNORECASE):
            normalized.append(t.upper())
        else:
            normalized.append(t.capitalize())
    tokens = normalized

    # Buckets
    buckets = {
        "Pre": [],
        "Concurrent": [],
        "Cross": [],
        "Classification": [],
        "Grade": []
    }

    current_bucket = None
    stack = []  # keeps nested groups
    negative_mode = False
    grade_mode = False

    def commit_group():
        """Commit top-level stack group into bucket"""
        nonlocal stack, current_bucket, negative_mode, grade_mode
        if not current_bucket or not stack:
            stack.clear()
            return
        group = stack[0] if stack else []
        label = "GRADE" if grade_mode else "NOT" if negative_mode else "GROUP"
        buckets[current_bucket].append({label: group})
        stack.clear()
        negative_mode = False
        grade_mode = False

    def add_to_stack(value: str, operator: str | None):
        """Add course/token to stack respecting AND/OR nesting"""
        nonlocal stack
        if not stack:
            stack.append([{"op": operator or "OR", "values": [value]}])
        else:
            current_level = stack[-1]
            if current_level[-1]["op"] == (operator or "OR"):
                current_level[-1]["values"].append(value)
            else:
                current_level.append({"op": operator or "OR", "values": [value]})

    current_operator = None

    for tok in tokens:
        tok_low = tok.lower()
        if tok in ("Pre", "Concurrent", "Cross"):
            commit_group()
            current_bucket = tok
            continue
        if tok_low == "grade":
            commit_group()
            current_bucket = "Grade"
            grade_mode = True
            continue
        if tok_low in ("and", "or", "/"):
            current_operator = tok_low.upper()
            continue
        if tok_low in ("not", "no"):
            negative_mode = True
            continue
        if tok in (";", "."):
            commit_group()
            current_bucket = None
            current_operator = None
            continue
        if tok in ("Senior", "Junior", "Sophomore", "Freshman"):
            if current_bucket is None:
                current_bucket = "Classification"
            add_to_stack(tok, current_operator)
            continue
        if re.match(r"(Exam|[A-Z]{2,4}\s\d{3})", tok, re.IGNORECASE):
            if current_bucket is None:
                current_bucket = "Pre"
            add_to_stack(tok, current_operator)
            continue

    commit_group()
    return buckets

def print_tree(course_name: str, buckets: Dict[str, Any]):
    print(f"--- TREE VIEW: {course_name} ---")
    for bucket, groups in buckets.items():
        if not groups:
            continue
        print(f"└──> [{bucket}]")
        for group in groups:
            for label, vals in group.items():
                print(f"    ├──> {label}:")
                for entry in vals:
                    op = entry["op"]
                    joined = ", ".join(entry["values"])
                    print(f"    │   ({op}) {joined}")
    print()

# Test cases
if __name__ == "__main__":
    tests = {
        "ECEN 403": "Prerequisites: Grade of C or better in COMM 205 or COMM 243 or ENGL 210; grade of C or better in ECEN 314, ECEN 325, and ECEN 350/CSCE 350 or CSCE 350/ECEN 350; grade of C or better in ECEN 303, ECEN 322, and ECEN 370, or grade C or better in CSCE 315 or CSCE 331, and ECEN 303 or STAT 211, and ECEN 449 or CSCE 462, or concurrent enrollment; senior classification.",
        "ACCT 210": "Prerequisite: ACCT 209 or ACCT 229."
    }

    for course, text in tests.items():
        buckets = parse_prerequisites(text)
        print_tree(course, buckets)
