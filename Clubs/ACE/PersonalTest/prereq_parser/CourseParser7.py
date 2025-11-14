import re

def parse_prerequisites(text: str):
    """
    Prototype parser for course prerequisite strings with AND/OR/NOT logic.
    Returns a structured dictionary of categorized prerequisites.
    """

    # STEP 1: Tokenization
    token_pattern = r"(Pre|Grade|or|and|/|cross|concurrent|not|no|\.|;|exam|[A-Z]{4}\s\d{3})"
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
            # Skip connectors after "Grade"
            if i + 1 < len(tokens) and tokens[i + 1].lower() in ("or", "and", "/"):
                skip_next = True
            continue
        clean_tokens.append(tok)
    tokens = clean_tokens

    # STEP 3: Initialize Buckets
    buckets = {
        "Pre": [],
        "Concurrent": [],
        "Cross": [],
        "Classification": [],
        "Exclusion": []  # NEW bucket for "not"/"no" statements
    }

    # Add classification requirements
    class_group = []
    for c in ("Senior", "Junior", "Sophomore", "Freshman"):
        if c.lower() in text.lower():
            class_group.append(c)
    if class_group:
        buckets["Classification"].append(class_group)

    # STEP 4: Token Processing
    current_bucket = None
    current_group = []
    logic_operator = None
    negative_mode = False  # Track if we’re in a NOT segment

    def commit_group():
        """Helper: safely commit a finished group to the current bucket."""
        nonlocal current_group, current_bucket, logic_operator, negative_mode
        if current_bucket and current_group:
            if logic_operator == "and":
                buckets[current_bucket].append({"AND": current_group})
            elif negative_mode:
                buckets["Exclusion"].append({"NOT": current_group})
            else:
                buckets[current_bucket].append({"OR": current_group})
        current_group = []
        logic_operator = None
        negative_mode = False

    for tok in tokens:
        # Handle bucket keywords
        if tok in ("Pre", "Concurrent", "Cross"):
            commit_group()  # finish previous
            current_bucket = tok
            continue

        # Handle logic keywords
        if tok.lower() in ("and", "or", "/"):
            logic_operator = tok.lower()
            continue

        # Handle negations
        if tok.lower() in ("not", "no"):
            negative_mode = True
            continue

        # Handle punctuation resets
        if tok in (";", "."):
            commit_group()
            current_bucket = None
            logic_operator = None
            negative_mode = False
            continue

        # Match course or exam code
        if re.match(r"(Exam|[A-Z]{4}\s\d{3})", tok, re.IGNORECASE):
            current_group.append(tok)

    # STEP 5: Finalize any remaining group
    commit_group()

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
            if "AND" in group:
                print(f"    ├──> AND Group:")
                for c in group["AND"]:
                    print(f"    │       {c}")
            elif "OR" in group:
                print(f"    ├──> OR Group:")
                for c in group["OR"]:
                    print(f"    │       {c}")
            elif "NOT" in group:
                print(f"    ├──> NOT Group:")
                for c in group["NOT"]:
                    print(f"    │       {c}")
    print()


# ----------------------------------------------------------------
# TEST CASES
# ----------------------------------------------------------------
if __name__ == "__main__":
    tests = {
        "STAT 211": "Prerequisite: Grade of C or better in MATH 142, MATH 147, MATH 151, or MATH 171, or concurrent enrollment. Concurrent enrollment in CHEM 117; Cross Listing: ECEN 222/CSCE 222.",
        "STAT 202": "Prerequisite: Grade of B or better in STAT 201 and MATH 151, or concurrent enrollment in STAT 202.",
        "CHEM 107": "Prerequisite: CHEM 107 or CHEM 101 and CHEM 117; Cross Listing: BIOL 107/BIOT 107.",
        "MATH 309": "Prerequisites: MATH 221, MATH 251, or MATH 253; MATH 308 or concurrent enrollment; junior or senior classification or approval of instructor.",
        "CSCE 350": "Prerequisites: Grade of C or better in ECEN 248 and CSCE 120; junior or senior classification. Cross Listing: ECEN 350/CSCE 350.",
        "MATH 142": "Prerequisites: Grade of C or better in MATH 140 or MATH 150, or equivalent or acceptable score on Texas A&M University math placement exam; not open to senior classification; also taught at Galveston campus."
    }

    for course, text in tests.items():
        buckets = parse_prerequisites(text)
        print_tree(course, buckets)
