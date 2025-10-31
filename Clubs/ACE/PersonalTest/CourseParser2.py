import re
from itertools import count

# ===============================
# Graph Data Structures
# ===============================

class Node:
    def __init__(self, node_id, node_type, value=None):
        self.id = node_id
        self.type = node_type  # COURSE, AND, OR, CONCURRENT
        self.value = value     # course code if COURSE

    def __repr__(self):
        return f"Node(id={self.id}, type={self.type}, value={self.value})"


class Edge:
    def __init__(self, parent_id, child_id):
        self.parent_id = parent_id
        self.child_id = child_id

    def __repr__(self):
        return f"Edge(parent={self.parent_id}, child={self.child_id})"


# ===============================
# Tokenization Helpers
# ===============================

def tokenize(text):
    """Replace punctuation with space to simplify. Split elements at spaces into tokens."""
    clean = re.sub(r"[.,;:]", " ", text)
    tokens = clean.split()
    return tokens

def is_course_code(token1, token2):
    """Detect COURSE CODE like MATH 151 or ECEN 222"""
    return (re.match(r"^[A-Z]{3,4}$", token1) and re.match(r"^\d{3}$", token2))

def parse_courses(tokens, start_idx):
    """Parse a list of courses starting at tokens[start_idx]. Returns list and new index."""
    courses = []
    i = start_idx
    while i < len(tokens)-1:
        if is_course_code(tokens[i], tokens[i+1]):
            courses.append(tokens[i] + " " + tokens[i+1])
            i += 2
        elif tokens[i] in {"or", "and", ","}:
            i += 1
        else:
            break
    return courses, i

# ===============================
# Graph Construction
# ===============================

def build_node(node_type, value=None, id_gen=None, nodes=None):
    node_id = next(id_gen)
    node = Node(node_id, node_type, value)
    nodes.append(node)
    return node

def build_graph_for_courses(courses, operator, parent_node, id_gen, nodes, edges):
    """
    Build either an OR or AND subgraph beneath parent_node for a list of courses.
    """
    if not courses:
        return

    if len(courses) == 1:
        # Single course, link directly
        course_node = build_node("COURSE", courses[0], id_gen, nodes)
        edges.append(Edge(parent_node.id, course_node.id))
    else:
        # Multiple courses -> introduce an OR or AND node
        op_node = build_node(operator, None, id_gen, nodes)
        edges.append(Edge(parent_node.id, op_node.id))

        for c in courses:
            c_node = build_node("COURSE", c, id_gen, nodes)
            edges.append(Edge(op_node.id, c_node.id))


# ===============================
# Main Parse Function
# ===============================

def parse_relation(text, target_course):
    tokens = tokenize(text)

    # ID generator for node IDs
    id_gen = count(1)

    nodes = []
    edges = []

    # Root node = the target course
    root_node = build_node("COURSE", target_course, id_gen, nodes)

    i = 0
    while i < len(tokens):
        token = tokens[i].lower()

        if token.startswith("prerequisite"):
            i += 1
            prereqs, i = parse_courses(tokens, i)
            build_graph_for_courses(prereqs, "OR", root_node, id_gen, nodes, edges)

        elif token == "concurrent":
            i += 3  # skip "enrollment in"
            concs, i = parse_courses(tokens, i)
            build_graph_for_courses(concs, "CONCURRENT", root_node, id_gen, nodes, edges)

        elif token == "cross":
            i += 2  # skip "listing"
            cross_str = tokens[i]
            cross_codes = cross_str.split("/")
            for code in cross_codes:
                if re.match(r"^[A-Z]{3,4}\d{3}$", code):
                    course_code = code[:4] + " " + code[4:]
                else:
                    if i+1 < len(tokens) and re.match(r"^\d{3}$", tokens[i+1]):
                        course_code = code + " " + tokens[i+1]
                        i += 1
                    else:
                        course_code = code
                cross_node = build_node("COURSE", course_code, id_gen, nodes)
                edges.append(Edge(root_node.id, cross_node.id))
            i += 1

        else:
            i += 1

    return nodes, edges


# ===============================
# Test
# ===============================

exTxt = "Prerequisite: Grade of C or better in MATH 142, MATH 147, MATH 151, or MATH 171, or concurrent enrollment. Concurrent enrollment in CHEM 117; Cross Listing: ECEN 222/CSCE 222."
target = "STAT 211"

nodes, edges = parse_relation(exTxt, target)

with open('output.txt', "w") as f:
    print("NODES:", file=f)
    for n in nodes:
        print(n, file=f)
    print("\nEDGES:", file=f)
    for e in edges:
        print(e, file=f)
