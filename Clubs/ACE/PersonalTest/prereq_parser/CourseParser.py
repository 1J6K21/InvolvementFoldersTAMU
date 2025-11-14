
class CourseNode:
    def __init__(self, code):
        self.code = code # class code
        self.prerequisites = set() # set of classes that are pre req
        self.concurrent = set() # set of classes to take concurrently
        self.cross_listed = set() # set of classes that are alias/same

    def __repr__(self):
        return (f"{self.code} -> prereq: {self.prerequisites}, "
                f"concurrent: {self.concurrent}, "
                f"cross: {self.cross_listed}")
    
import re

def tokenize(text):
    """Replace potential punctuation with space to simplify.
        Split elements at spaces into list items called tokens"""
    clean = re.sub(r"[.,;:]", " ", text)
    tokens = clean.split()
    return tokens


def is_course_code(token1, token2):
    # A course code will be 4 characters followed by 3 digits
    # Ex: CHEM 107, MATH 251
    return (re.match(r"^[A-Z]{3,4}$", token1) and re.match(r"^\d{3}$", token2))


def parse_courses(tokens, start_idx):
    """Parse a list of courses starting at tokens[start_idx]"""
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

def parse_relation(text, target_course):
    tokens = tokenize(text)
    node = CourseNode(target_course)

    i = 0
    while i < len(tokens):
        token = tokens[i].lower()

        if token.startswith("prerequisite"):
            i += 1
            prereqs, i = parse_courses(tokens, i)
            for c in prereqs:
                node.prerequisites.add(c)

        elif token == "concurrent":
            # skip "enrollment" "in"
            i += 3
            concs, i = parse_courses(tokens, i)
            for c in concs:
                node.concurrent.add(c)

        elif token == "cross":
            # skip "listing:"
            i += 2
            # parse course pairs like ECEN 222/CSCE 222
            cross_str = tokens[i]
            cross_codes = cross_str.split("/")
            for code in cross_codes:
                # Assume course format like ECEN or CSCE
                # We'll use tokens[i+1] as number if needed
                if re.match(r"^[A-Z]{3,4}\d{3}$", code):
                    # Already joined
                    node.cross_listed.add(code[:4] + " " + code[4:])
                else:
                    # We need next token
                    if i+1 < len(tokens) and re.match(r"^\d{3}$", tokens[i+1]):
                        node.cross_listed.add(code + " " + tokens[i+1])
                        i += 1
            i += 1
        else:
            i += 1

    return node

exTxt = ex = "Prerequisite: Grade of C or better in MATH 142, MATH 147, MATH 151, or MATH 171, or concurrent enrollment. Concurrent enrollment in CHEM 117; Cross Listing: ECEN 222/CSCE 222."
target = "STAT 211"
node = parse_relation(exTxt, target)
print(node)