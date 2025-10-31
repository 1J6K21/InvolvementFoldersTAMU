import re
from pprint import pprint

def parse_prerequisites(text: str):
    """
    Prototype parser for course prerequisite strings.
    Returns a structured dictionary of categorized prerequisites.
    """

    # STEP 1: Tokenization
    token_pattern = r"(Pre|Grade|or|and|/|cross|concurrent|[A-Z]{4}\s\d{3})"
    tokens = re.findall(token_pattern, text, flags=re.IGNORECASE)

    # Normalize capitalization
    tokens = [t.capitalize() if len(t) > 1 else t for t in tokens]

    # STEP 2: Apply Exception Rules
    clean_tokens = []
    skip_next = False
    for i, tok in enumerate(tokens):
        if skip_next:
            skip_next = False
            continue
        if tok == "Grade":
            # Skip the following connector (or/and/)
            if i + 1 < len(tokens) and tokens[i + 1].lower() in ("or", "and", "/"):
                skip_next = True
            continue
        clean_tokens.append(tok)
    tokens = clean_tokens

    # STEP 3: Bucket sorting
    buckets = {"Pre": [], "Concurrent": [], "Cross": []}
    current_bucket = None
    current_group = []
    logic_operator = None

    for tok in tokens:
        if tok in ("Pre", "Concurrent", "Cross"):
            if current_bucket and current_group:
                buckets[current_bucket].append(current_group)
                current_group = []
            current_bucket = tok
            continue

        if tok.lower() in ("and", "or", "/"):
            logic_operator = tok.lower()
            continue

        if re.match(r"[A-Z]{4}\s\d{3}", tok, re.IGNORECASE):
            current_group.append(tok)

    if current_bucket and current_group:
        buckets[current_bucket].append(current_group)

    return buckets


def print_tree(course_name: str, buckets: dict):
    """
    Print the parsed structure as a readable tree view.
    """
    print(f"--- TREE VIEW: {course_name} ---")
    for bucket, groups in buckets.items():
        if not groups:
            continue
        print(f"└──> [{bucket}]")
        for group in groups:
            # Detect if multiple courses → treat as "OR" group
            if len(group) > 1:
                print(f"    ├──> OR Group:")
                for c in group:
                    print(f"    │       {c}")
            else:
                print(f"    └──> {group[0]}")
    print()


# ----------------------------------------------------------------
# TEST CASES
# ----------------------------------------------------------------
if __name__ == "__main__":
    tests = {
        "STAT 211": "Prerequisite: Grade of C or better in MATH 142, MATH 147, MATH 151, or MATH 171, or concurrent enrollment. Concurrent enrollment in CHEM 117; Cross Listing: ECEN 222/CSCE 222.",
        "STAT 202": "Prerequisite: Grade of B or better in STAT 201 and MATH 151, or concurrent enrollment in STAT 202.",
        "CHEM 107": "Prerequisite: CHEM 107 or CHEM 101 and CHEM 117; Cross Listing: BIOL 107/BIOT 107."
    }

    for course, text in tests.items():
        buckets = parse_prerequisites(text)
        print_tree(course, buckets)


"""
=== TEST 1 ===
STEP 1 — Tokens:
['Pre', 'Grade', 'or', 'MATH 142', 'MATH 147', 'MATH 151', 'or', 'MATH 171',
 'or', 'concurrent', 'Concurrent', 'CHEM 117', 'Cross', 'ECEN 222', 'CSCE 222']

STEP 2 — After Exceptions:
['Pre', 'MATH 142', 'MATH 147', 'MATH 151', 'or', 'MATH 171', 'or', 'concurrent', 'Concurrent', 'CHEM 117', 'Cross', 'ECEN 222', 'CSCE 222']

STEP 3 — Bucket Grouping:
{'Concurrent': [['CHEM 117']],
 'Cross': [['ECEN 222', 'CSCE 222']],
 'Pre': [['MATH 142', 'MATH 147', 'MATH 151', 'MATH 171']]}


"""