import re
from typing import List, Optional

# --- Node class ---
class Node:
    def __init__(self, type_: str, value: Optional[str] = None, require_grade: bool = False):
        self.type = type_               # "COURSE", "AND", "OR", "CONCURRENT/PASSED", "CLASSIFICATION", "ROOT"
        self.value = value              # used for COURSE or CLASSIFICATION
        self.children: List[Node] = []  # children for AND/OR/ROOT nodes
        self.require_grade = require_grade

    def add(self, child: "Node"):
        self.children.append(child)

    def __repr__(self):
        g = " [GRADE]" if self.require_grade else ""
        if self.value:
            return f"{self.type}:{self.value}{g}"
        return f"{self.type}{g}"


# --- Tokenizer ---
def tokenize_segment(segment: str) -> List[str]:
    # Normalize and mark Grade phrases as a single token 'GRADE'
    seg = segment.strip()
    # common grade patterns -> single 'GRADE' token
    seg = re.sub(r"(?i)grade\s+of\s+[A-Za-z0-9\/\s]*?or\s+better\s+in\s+", " GRADE ", seg)
    seg = re.sub(r"(?i)grade\s+of\s+[A-Za-z0-9\/\s]*?or\s+better\s*", " GRADE ", seg)
    seg = re.sub(r"(?i)grade\s+c\s+or\s+better\s+in\s+", " GRADE ", seg)
    seg = re.sub(r"(?i)grade\s+c\s+or\s+better\s*", " GRADE ", seg)

    # add spaces around punctuation we care about
    seg = re.sub(r'([,;/\.])', r' \1 ', seg)
    seg = re.sub(r'\s+', ' ', seg).strip()

    # token pattern includes:
    # - GRADE
    # - course codes like ECEN 314 (2-4 letters plus 3 digits possibly without space)
    # - known keywords: or, and, concurrent, senior/junior/sophomore/freshman, exam
    # - slash and punctuation tokens handled above
    token_re = re.compile(r'(GRADE|[A-Z]{2,4}\s?\d{3}|or\b|and\b|/|,|;|concurrent\b|exam\b|senior\b|junior\b|sophomore\b|freshman\b)', re.IGNORECASE)
    raw = token_re.findall(seg)
    tokens = []
    for t in raw:
        t = t.strip()
        if not t:
            continue
        # keep course tokens uppercased and with a single space between dept and number
        if re.match(r'^[A-Za-z]{2,4}\s?\d{3}$', t):
            # normalize course format: "ECEN314" or "ECEN 314" -> "ECEN 314"
            m = re.match(r'^([A-Za-z]{2,4})\s?(\d{3})$', t)
            tokens.append(f"{m.group(1).upper()} {m.group(2)}")
        else:
            tokens.append(t.lower())
    return tokens


# --- Recursive descent parser for a single segment ---
def parse_segment(segment: str) -> Optional[Node]:
    tokens = tokenize_segment(segment)
    if not tokens:
        return None
    pos = 0

    def peek(offset=0):
        return tokens[pos + offset] if pos + offset < len(tokens) else None

    def consume():
        nonlocal pos
        t = peek()
        if t is not None:
            pos += 1
        return t

    # factor: course (maybe cross-list A/B/... -> returns OR), concurrent, classification, exam
    def parse_factor() -> Optional[Node]:
        tk = peek()
        if tk is None:
            return None
        if tk == 'concurrent':
            consume()
            return Node("CONCURRENT/PASSED")
        if tk == 'exam':
            consume()
            return Node("COURSE", "EXAM")
        if re.match(r'^[A-Z]{2,4}\s\d{3}$', tk):
            # handle cross-list: course (/ course)*
            first = consume()
            if peek() == '/':
                courses = [first]
                while peek() == '/':
                    consume()  # skip '/'
                    nxt = peek()
                    if nxt and re.match(r'^[A-Z]{2,4}\s\d{3}$', nxt):
                        courses.append(consume())
                    else:
                        break
                # return OR node of course children
                or_node = Node("OR")
                for c in courses:
                    or_node.add(Node("COURSE", c))
                return or_node
            else:
                return Node("COURSE", first)
        if tk in ("senior", "junior", "sophomore", "freshman"):
            consume()
            return Node("CLASSIFICATION", tk.capitalize())
        # unknown token — skip it and return None (tolerant)
        consume()
        return None

    # term: factors joined by AND (commas or 'and')
    def parse_term() -> Optional[Node]:
        first = parse_factor()
        if first is None:
            return None
        nodes = [first]
        while True:
            tk = peek()
            if tk in (',', 'and'):
                consume()
                f = parse_factor()
                if f:
                    nodes.append(f)
                continue
            break
        if len(nodes) == 1:
            return nodes[0]
        and_node = Node("AND")
        for n in nodes:
            and_node.add(n)
        return and_node

    # expression: terms joined by OR (lowest precedence)
    def parse_expression() -> Optional[Node]:
        # handle leading GRADE flags: if present, we apply to the next term (and any OR composed of terms)
        grade_flag = False
        while peek() == 'grade':
            consume()
            grade_flag = True
        first_term = parse_term()
        if first_term is None:
            return None
        terms = [first_term]
        while True:
            if peek() == 'or':
                consume()
                # allow grade tokens between ors (rare but handle)
                inner_grade = False
                while peek() == 'grade':
                    consume()
                    inner_grade = True
                t2 = parse_term()
                if t2:
                    # if inner_grade, attach to t2
                    if inner_grade:
                        # set require on subtree
                        set_require_grade(t2)
                    terms.append(t2)
                continue
            break
        # if only one term, apply grade_flag to it and return
        if len(terms) == 1:
            if grade_flag:
                set_require_grade(terms[0])
            return terms[0]
        # create OR node
        or_node = Node("OR")
        for t in terms:
            or_node.add(t)
        if grade_flag:
            set_require_grade(or_node)
        return or_node

    # helper to set require_grade recursively on a node
    def set_require_grade(node: Node):
        node.require_grade = True
        # propagate to leaves if it's an AND/OR wrapper (leave children be, but mark the group)
        # do not overwrite existing child flags; group-level flag is enough.

    root = parse_expression()
    return root


# --- Top-level: split segments by ; and . and combine with AND at root ---
def parse_text_to_tree(text: str) -> Node:
    raw_segments = [s.strip() for s in re.split(r'[;\.]', text) if s.strip()]
    children = []
    for seg in raw_segments:
        node = parse_segment(seg)
        if node is None:
            continue
        # If segment contained the word 'concurrent' and the parse didn't make it an OR alternative,
        # ensure concurrent shows up as an OR child at same level by treating parse_segment result as a term.
        # (But parse_factor already returns CONCURRENT when present.)
        children.append(node)
    if not children:
        return Node("ROOT")
    if len(children) == 1:
        return Node("ROOT", children=children)
    root = Node("ROOT")
    root.add(Node("AND"))
    for c in children:
        root.children[0].add(c)
    return root


# --- Pretty print ---
def print_tree(node: Node, indent: int = 0):
    pad = " " * (4 * indent)
    meta = " [GRADE]" if node.require_grade else ""
    if node.type == "COURSE":
        print(f"{pad}- COURSE: {node.value}{meta}")
    elif node.type == "CLASSIFICATION":
        print(f"{pad}- CLASSIFICATION: {node.value}{meta}")
    elif node.type == "CONCURRENT/PASSED":
        print(f"{pad}- CONCURRENT/PASSED{meta}")
    else:
        print(f"{pad}- {node.type}{meta}")
    for child in node.children:
        print_tree(child, indent + 1)


# ------------------ Tests ------------------
if __name__ == "__main__":
    tests = {
        "ECEN 403": "Prerequisites: Grade of C or better in COMM 205 or COMM 243 or ENGL 210; "
                    "grade of C or better in ECEN 314, ECEN 325, and ECEN 350/CSCE 350 or CSCE 350/ECEN 350; "
                    "grade of C or better in ECEN 303, ECEN 322, and ECEN 370, or grade C or better in CSCE 315 or CSCE 331, "
                    "and ECEN 303 or STAT 211, and ECEN 449 or CSCE 462, or concurrent enrollment; senior classification.",
        "ACCT 210": "Prerequisite: ACCT 209 or ACCT 229."
    }

    for course, text in tests.items():
        print(f"\n=== {course} ===")
        tree = parse_text_to_tree(text)
        print_tree(tree)
