import re

def parse_prerequisites(text: str):
    """
    Parser for course prerequisite strings with AND/OR/NOT logic integrated in-bucket.
    """

    # STEP 1: Tokenization
    token_pattern = r"(Pre|Grade|or|and|/|cross|concurrent|not|no|\.|;|exam|Senior|Junior|Sophomore|Freshman|[A-Z]{2,4}\s\d{3})"
    tokens = re.findall(token_pattern, text, flags=re.IGNORECASE)

    # Normalize capitalization
    normalized = []
    for t in tokens:
        if re.match(r"[A-Z]{2,4}\s\d{3}", t, re.IGNORECASE):
            normalized.append(t.upper())
        else:
            normalized.append(t.capitalize())
    tokens = normalized

    # STEP 2: Skip connector after "Grade"
    clean_tokens = []
    skip_next = False
    for i, tok in enumerate(tokens):
        if skip_next:
            skip_next = False
            continue
        if tok == "Grade":
            if i + 1 < len(tokens) and tokens[i + 1].lower() in ("or", "and", "/"):
                skip_next = True
            continue
        clean_tokens.append(tok)
    tokens = clean_tokens

    # STEP 3: Buckets
    buckets = {
        "Pre": [],
        "Concurrent": [],
        "Cross": [],
        "Classification": []
    }

    current_bucket = None
    current_group = []
    logic_operator = None
    negative_mode = False

    def commit_group():
        """Commit current group into its bucket, applying logical/negative context."""
        nonlocal current_group, current_bucket, logic_operator, negative_mode

        # Check if there’s something to save.
        if not current_bucket or not current_group:
            #If there’s no active bucket (like “Pre”) or nothing collected yet (current_group is empty), it just resets and returns.
            current_group = []
            negative_mode = False
            return

        # Determine the label for the group:
        label = "OR"
        if negative_mode:
            label = "NOT"
        elif logic_operator == "and":
            label = "AND"
        if(logic_operator == "/"):
            current_group = set(current_group)
        # Store the group:
        # It appends a dictionary like { "OR": ["MATH 142", "MATH 147", "MATH 151"] } into the appropriate bucket (e.g., buckets["Pre"]).
        buckets[current_bucket].append({label: current_group.copy()})

        # Reset temporary variables so the parser can start fresh for the next group or sentence
        current_group = []
        logic_operator = None
        negative_mode = False

    # STEP 4: Parsing loop
    for tok in tokens:
        tok_low = tok.lower()
        #Types of buckets
        if tok in ("Pre", "Concurrent", "Cross"):
            commit_group()
            current_bucket = "Pre" if tok == "Pre" else ("Concurrent" if tok == "Concurrent" else "Cross")
            continue
        #Logical Groups
        if tok_low in ("and", "or", "/"):
            logic_operator = tok_low
            continue
        #Negative Logical Group
        if tok_low in ("not", "no"):
            negative_mode = True
            continue
        #Segment Break
        if tok in (";", "."):
            commit_group()
            current_bucket = None
            logic_operator = None
            negative_mode = False
            continue
        
        # Classification handling
        if tok in ("Senior", "Junior", "Sophomore", "Freshman"):
            if current_bucket is None:
                current_bucket = "Classification"
            current_group.append(tok)
            continue

        # Courses or exam
        if re.match(r"(Exam|[A-Z]{2,4}\s\d{3})", tok, re.IGNORECASE):
            if current_bucket is None:
                current_bucket = "Pre"
            current_group.append(tok)
            continue

    # Commit final group
    commit_group()

    return buckets


def print_tree(course_name: str, buckets: dict):
    """Pretty print tree output."""
    print(f"--- TREE VIEW: {course_name} ---")
    for bucket, groups in buckets.items():
        if not groups:
            continue
        print(f"└──> [{bucket}]")
        for group in groups:
            if isinstance(group, dict):
                for key, values in group.items():
                    print(f"    ├──> {key} Group:")
                    for v in values:
                        print(f"    │       {v}")
            elif group:
                print(f"    └──> {group}")
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
        "MATH 142": "Prerequisites: Grade of C or better in MATH 140 or MATH 150, or equivalent or acceptable score on Texas A&M University math placement exam; not open to senior classification; also taught at Galveston campus.",
        "MATH 000": "Prerequisites: No use of MATH 001; exam; no seniors",
        "CSCE 313": "Prerequisite: CSCE 221 with a grade of C or better; grade of C or better in CSCE 312 or concurrent enrollment in CSCE 350/ECEN 350 or ECEN 350/CSCE 350.",
        "ECEN 403": "Prerequisites: Grade of C or better in COMM 205 or COMM 243 or ENGL 210; grade of C or better in ECEN 314, ECEN 325, and ECEN 350/CSCE 350 or CSCE 350/ECEN 350; grade of C or better in ECEN 303, ECEN 322, and ECEN 370, or grade C or better in CSCE 315 or CSCE 331, and ECEN 303 or STAT 211, and ECEN 449 or CSCE 462, or concurrent enrollment; senior classification.",
        "ACCT 210": "Prerequisite: ACCT 209 or ACCT 229."
    }

    for course, text in tests.items():
        buckets = parse_prerequisites(text)
        print_tree(course, buckets)
