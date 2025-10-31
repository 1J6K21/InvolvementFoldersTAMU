import re
from collections import defaultdict

# ---------- PARSER ----------
def parse_course_info(text):
    """
    Parse course information text to extract relationships:
    - Prerequisites
    - Corequisites (concurrent)
    - Cross-listed courses
    Automatically detects 'or' groups.
    """
    courses = defaultdict(lambda: {"prereq": [], "concurrent": [], "cross": []})
    
    # Identify main course code, e.g. "STAT 211"
    main_match = re.match(r"([A-Z]{2,4}\s*\d{3})", text)
    if not main_match:
        return courses
    main_course = main_match.group(1).strip()

    # Regex patterns for relations
    prereq_pattern = r"Prerequisite[s]?:\s*(.+?)(?:\.|$)"
    coreq_pattern = r"Corequisite[s]?:\s*(.+?)(?:\.|$)"
    cross_pattern = r"Cross[- ]listed with\s*(.+?)(?:\.|$)"

    def parse_relation(match, key):
        """Helper function to process a relation line"""
        if not match:
            return
        rel_text = match.group(1)
        rel_text = rel_text.replace("and", ",")  # treat "and" as separate
        groups = [grp.strip() for grp in rel_text.split(" or ")]  # split on "or"
        
        or_group = []
        for g in groups:
            codes = re.findall(r"[A-Z]{2,4}\s*\d{3}", g)
            if codes:
                if len(codes) > 1:
                    # treat "and" (multiple required) as separate entries
                    for c in codes:
                        courses[main_course][key].append([c])
                else:
                    or_group.append(codes[0])
        if len(or_group) > 1:
            courses[main_course][key].append(or_group)
        elif len(or_group) == 1:
            courses[main_course][key].append([or_group[0]])

    # Apply matchers
    parse_relation(re.search(prereq_pattern, text, re.IGNORECASE), "prereq")
    parse_relation(re.search(coreq_pattern, text, re.IGNORECASE), "concurrent")
    parse_relation(re.search(cross_pattern, text, re.IGNORECASE), "cross")

    return courses


# ---------- TREE VIEW PRINTER ----------
def print_tree(course, data, indent=0):
    """Print a course dependency tree with visual indentation."""
    prefix = "    " * indent
    print(f"{prefix}└──> [{course}]")
    if course not in data:
        return

    for rel_type, groups in data[course].items():
        if not groups:
            continue
        print(f"{prefix}    └──> ({rel_type})")
        for group in groups:
            if len(group) > 1:
                print(f"{prefix}        └──> (OR group)")
                for c in group:
                    print(f"{prefix}            └──> [{c}]")
            else:
                print(f"{prefix}        └──> [{group[0]}]")


# ---------- TEST CASE ----------
if __name__ == "__main__":
    test1 = """
    STAT 211. Principles of Statistics I. (3-0). Credit 3.
    Prerequisite: MATH 142 or MATH 147 or MATH 151 or MATH 171.
    Corequisite: CHEM 117.
    Cross-listed with ECEN 222 and CSCE 222.
    """

    data = parse_course_info(test1)
    print("--- TREE VIEW: STAT 211 ---")
    print_tree("STAT 211", data)
