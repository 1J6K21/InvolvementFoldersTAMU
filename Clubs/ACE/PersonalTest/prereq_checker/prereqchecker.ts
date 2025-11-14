import fs from "fs";

type PrereqBucket = (string | boolean | PrereqBucket)[];

/**
 * Loads and parses prerequisite info from JSON file.
 */
function parsePrereq(
    filename: string,
    courseName: string
): PrereqBucket | false {
    try {
        const data = JSON.parse(fs.readFileSync(filename, "utf-8"));
        const classBucket = data[courseName];
        const prereqBuckets = classBucket["info"]["prereqs"];
        return prereqBuckets;
    } catch (err) {
        console.error("Error loading prereqs:", err);
        return false;
    }
}

/**
 * Recursively evaluates a prereq 'bucket' list.
 * Returns true or false.
 */
function evaluateBucket(
    coursesTaken: string[],
    coursesEnrolled: string[],
    bucket: string | boolean | PrereqBucket
): boolean {
    console.log("Evaluating bucket:", JSON.stringify(bucket, null, 2));

    // Base case: if it's a string
    if (typeof bucket === "string") {
        if(bucket == "."){
            return false;
        }
        // at this point should only be boolean because we took care of string case
        return Boolean(evaluateSingleRequirement(coursesTaken, coursesEnrolled, bucket)) ;
    }

    // Base case: if it's already boolean
    if (typeof bucket === "boolean") {
        return bucket;
    }

    // Recursive case: evaluate sub-buckets
    const evaluated: (boolean | string)[] = bucket.map((element) => {
        if (Array.isArray(element)) {
            return evaluateBucket(coursesTaken, coursesEnrolled, element);
        } else if (typeof element === "string") {
            return evaluateSingleRequirement(coursesTaken, coursesEnrolled, element);
        } else {
            return element;
        }
    });

    // Process ORs (".") left to right
    while (evaluated.includes(".")) {
        const idx = evaluated.indexOf(".");
        const left = Boolean(evaluated[idx - 1]);
        const right = Boolean(evaluated[idx + 1]);
        evaluated.splice(idx - 1, 3, left || right);
    }

    // After ORs, all remaining are ANDs
    return evaluated.every((v) => v === true);
}

/**
 * Evaluates one course requirement token.
 * Supports course codes and those ending with ^ (in progress).
 */
function evaluateSingleRequirement(
    coursesTaken: string[],
    coursesEnrolled: string[],
    token: string
): boolean | string {
    const pattern = /^[A-Z]{4}\d{3}\s*[^\\^]*$/;
    const inProgressPattern = /^[A-Z]{4}\d{3}\s*[^\\^]*\^$/;

    if (token === ".") {
        // handled elsewhere
        return token;
    }

    token = token.trim();

    // Taken courses
    if (pattern.test(token)) {
        return coursesTaken.includes(token);
    }

    // Currently enrolled (marked with ^)
    if (inProgressPattern.test(token)) {
        return coursesEnrolled.includes(token);
    }

    return false;
}

/**
 * Entry wrapper function
 */
function prereqChecker(
    coursesTaken: string[],
    coursesEnrolled: string[],
    prereqBucket: PrereqBucket
): boolean {
    return evaluateBucket(coursesTaken, coursesEnrolled, prereqBucket);
}

// Example usage:

const prereqBucket = parsePrereq(
    "data_Spring2026_Prereq_test (1).json",
    "ECEN_403"
);
if (prereqBucket === false) {
    process.exit(1);
}

console.assert(
    prereqChecker(
        [
            "COMM205 C",
            "ECEN314 C",
            "ECEN325 C",
            "CSCE350 C",
            "ECEN303 C",
            "ECEN322 C",
            "ECEN370 C",
        ],
        [],
        prereqBucket
    ) === true
);

console.assert(
    prereqChecker(
        [
            "ECEN314 C",
            "ECEN325 C",
            "CSCE350 C",
            "CSCE315 C",
            "ECEN303 C",
            "COMM205 C",
        ],
        ["ECEN449 C ^"],
        prereqBucket
    ) === true
);

console.assert(
    prereqChecker(
        ["ECEN314 C", "ECEN325 C", "CSCE350 C", "CSCE315 C", "ECEN303 C"],
        ["ECEN449 C ^"],
        prereqBucket
    ) === false
);

console.log("All assertions passed.");

