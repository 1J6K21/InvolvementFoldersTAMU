import json
import re

def parse_prereq(filename, course_name):
    try:
        with open(filename) as f:
            data = json.load(f)
            class_bucket = data[course_name]
            prereq_buckets = class_bucket["info"]["prereqs"]
            return prereq_buckets
    except Exception as e:
        print("Error loading prereqs:", e)
        return False


def evaluate_bucket(courses_taken, courses_enrolled, bucket):
    """
    Recursively evaluate a prereq 'bucket' list.
    Returns True or False.
    """
    print("Evaluating bucket:", json.dumps(bucket, indent=2))
    # Base case: if it's a string
    if isinstance(bucket, str):
        return evaluate_single_requirement(courses_taken, courses_enrolled, bucket)
    
    # Base case: if it's a boolean already
    if isinstance(bucket, bool):
        return bucket
    
    # Recursive case: evaluate sub-buckets
    evaluated = []
    for element in bucket:
        if isinstance(element, list):
            evaluated.append(evaluate_bucket(courses_taken, courses_enrolled, element))
        elif isinstance(element, str):
            evaluated.append(evaluate_single_requirement(courses_taken, courses_enrolled, element))
        else: #boolean
            evaluated.append(element)
    
    # Process ORs (".") left to right
    while "." in evaluated:
        idx = evaluated.index(".")
        left = evaluated[idx - 1]
        right = evaluated[idx + 1]
        evaluated[idx - 1:idx + 2] = [left or right]

    # After ORs, the remaining items are ANDs
    return all(evaluated)


def evaluate_single_requirement(courses_taken, courses_enrolled, token):
    """
    Evaluates one course requirement token.
    Supports: course codes, and course codes ending with ^ (in progress).
    """
    pattern = r"[A-Z]{4}\d{3}\s*[^\\^]*"
    if token == ".":
        # handled elsewhere
        return token

    # Check taken courses
    if re.match(pattern + r"$", token.strip()):
        return token.strip() in courses_taken

    # Check currently enrolled (marked with ^)
    if re.match(pattern + r"\^$", token.strip()):
        return token.strip() in courses_enrolled

    return False


def prereqchecker(courses_taken, courses_enrolled, prereq_bucket):
    return evaluate_bucket(courses_taken, courses_enrolled, prereq_bucket)


if __name__ == "__main__":
    prereq_bucket = parse_prereq("data_Spring2026_Prereq_test (1).json", "ECEN_403")
    
    # Example test cases:
    assert prereqchecker(
        ["COMM205 C", "ECEN314 C", "ECEN325 C", "CSCE350 C", "ECEN303 C", "ECEN322 C", "ECEN370 C"],
        [],
        prereq_bucket
    ) == True
    
    assert prereqchecker(
        ["ECEN314 C", "ECEN325 C", "CSCE350 C", "CSCE315 C",  "ECEN303 C", "COMM205 C"],
        ["ECEN449 C ^"],
        prereq_bucket
    ) == True

    assert prereqchecker(
        ["ECEN314 C", "ECEN325 C", "CSCE350 C", "CSCE315 C",  "ECEN303 C"],
        ["ECEN449 C ^"],
        prereq_bucket
    ) == False
