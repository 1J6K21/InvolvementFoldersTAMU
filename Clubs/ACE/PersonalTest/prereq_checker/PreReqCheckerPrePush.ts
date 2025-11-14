import * as fs from "fs";
import * as assert from "assert";

// --- Types ---
type PrereqBucket = string | boolean | (string | boolean | PrereqBucket)[];

// --- Parse prereq file ---
function parsePrereq(filename: string, courseName: string): PrereqBucket | false {
    try {
        const data = JSON.parse(fs.readFileSync(filename, "utf-8"));
        const classBucket = data[courseName];
        const prereqBuckets = classBucket["info"]["prereqs"];
        return prereqBuckets;
    } catch (e) {
        console.error("Error loading prereqs:", e);
        return false;
    }
}

// --- Evaluate recursively ---
function evaluateBucket(
    coursesTaken: string[],
    coursesEnrolled: string[],
    bucket: PrereqBucket
): boolean | string {
    // Debug logging (uncomment to trace)
    // console.log("Evaluating bucket:", JSON.stringify(bucket, null, 2));

    // Base case: string
    if (typeof bucket === "string") {
        return evaluateSingleRequirement(coursesTaken, coursesEnrolled, bucket);
    }

    // Base case: boolean
    if (typeof bucket === "boolean") {
        return bucket;
    }

    // Recursive case: evaluate sub-buckets
    const evaluated: (boolean | string)[] = [];
    for (const element of bucket) {
        if (Array.isArray(element)) {
            evaluated.push(evaluateBucket(coursesTaken, coursesEnrolled, element));
        } else if (typeof element === "string") {
            evaluated.push(evaluateSingleRequirement(coursesTaken, coursesEnrolled, element));
        } else {
            evaluated.push(element);
        }
    }

    // Process ORs (".") left to right
    while (evaluated.includes(".")) {
        const idx = evaluated.indexOf(".");
        const left = evaluated[idx - 1] as boolean;
        const right = evaluated[idx + 1] as boolean;
        evaluated.splice(idx - 1, 3, left || right);
    }

    // After ORs, remaining items are ANDs - all must be true
    return evaluated.every(v => v === true);
}

// --- Evaluate a single token like "CHEM107 C ^" ---
function evaluateSingleRequirement(
    coursesTaken: string[],
    coursesEnrolled: string[],
    token: string
): boolean | string {
    token = token.trim();

    // OR passthrough
    if (token === ".") return token;

    const pattern = /^([A-Z]{4}\d{3})\s*([A-F])?(?:\s*\^)?$/;
    const match = token.match(pattern);
    if (!match) return false; 

    // match[1] and match[2] are present because pattern matched
    const courseCode = match[1] as string;
    const minGrade = (match[2] as string) || "D";

    const requiredWithGrade = `${courseCode} ${minGrade}`;
    const requiredConcurrent = `${requiredWithGrade} ^`;

    const extractGrade = (entry: string): string | null => {
        const parts = entry.trim().split(/\s+/);
        const last = parts[parts.length - 1] ?? "";
        return /^[A-F]$/.test(last) ? last : null;
    };

    // --- 1️⃣ Concurrently enrolled (CHEM107 C ^) ---
    if (coursesEnrolled.includes(requiredConcurrent)) return true;

    // --- 2️⃣ Already taken with sufficient grade ---
    for (const taken of coursesTaken) {
        if (taken.startsWith(courseCode)) {
            const grade = extractGrade(taken);
            if (grade && grade <= minGrade) {  // 'A' <= 'C' -> true (satisfied)
                return true;
            }
        }
    }

    // --- 3️⃣ Enrolled in the same course (not necessarily with ^) ---
    for (const enrolled of coursesEnrolled) {
        if (enrolled.startsWith(courseCode)) {
            return true;
        }
    }

    return false;
}

// --- Wrapper ---
function prereqchecker(
    coursesTaken: string[],
    coursesEnrolled: string[],
    prereqBucket: PrereqBucket
): boolean {
    return Boolean(evaluateBucket(coursesTaken, coursesEnrolled, prereqBucket));
}

// Dummy version to simulate your prereqchecker
function prereqcheckerDummy(a: string[]): boolean {
    return a.includes("PASS");
}

// --- Example main ---
if (require.main === module) {
    
    const prereqBucket = parsePrereq("../data_Spring2026_Prereq_test (1).json", "ECEN_403");

    if (prereqBucket) {
        console.assert(
            prereqchecker(
                ["COMM205 C", "ECEN314 C", "ECEN325 C", "CSCE350 C", "ECEN303 C", "ECEN322 C", "ECEN370 C"],
                [],
                prereqBucket
            ) === true
        );

        console.assert(
            prereqchecker(
                ["ECEN314 C", "ECEN325 C", "CSCE350 C", "CSCE315 C", "ECEN303 C", "COMM205 C"],
                ["ECEN449 C ^"],
                prereqBucket
            ) === true
        );

        console.assert(
            prereqchecker(
                ["ECEN314 C", "ECEN325 C", "CSCE350 C", "CSCE315 C", "ECEN303 C"],
                ["ECEN449 C ^"],
                prereqBucket
            ) === false
        );
    }

    const FINC_428_prereq_bucket = parsePrereq("../data_Spring2026_Prereq_test (1).json", "FINC_428");

    if (FINC_428_prereq_bucket) {
        console.assert(prereqchecker([], [], FINC_428_prereq_bucket) === false);
        console.assert(
            prereqchecker(
                ["FINC421 D", "FINC361 D"],
                ["ACCT328 D ^"],
                FINC_428_prereq_bucket
            ) === true
        );
        console.assert(
            prereqchecker(
                ["FINC421 D", "FINC361 D", "ACCT328 C"],
                [],
                FINC_428_prereq_bucket
            ) === true
        );
        console.assert(
            prereqchecker(
                ["FINC421 A", "FINC361 D"],
                ["ACCT328 ^"],
                FINC_428_prereq_bucket
            ) === true
        );
        
    }
    const CSCE_421_prereq_bucket = parsePrereq("../data_Spring2026_Prereq_test (1).json", "CSCE_421");
    if(CSCE_421_prereq_bucket){    
        console.assert(
            prereqchecker(
                ["ECEN303 C", "CSCE120 C"],
                [],
                CSCE_421_prereq_bucket
            ) === false
        );
        
    }    

    // Load test data (adjust filename as needed)
    const CSCE_421_prereq_bucket2 = parsePrereq("../data_Spring2026_Prereq_test (1).json", "CSCE_421");

    // ✅ Assertion 1 — should be false
    {
        const result = prereqchecker(["ECEN303 C", "CSCE120 C"], [], CSCE_421_prereq_bucket2);
        assert.strictEqual(
            result,
            false,
            `Expected false, got ${result} for prereqchecker(["ECEN303 C", "CSCE120 C"], [])`
        );
    }

    // ✅ Assertion 2 — should be false
    {
        const result = prereqchecker(["ECEN303 C", "CSCE120 C"], [], CSCE_421_prereq_bucket2);
        assert.strictEqual(
            result,
            false,
            `Expected false, got ${result} for prereqchecker(["ECEN303 C", "CSCE120 C", "CSCE310 B"], [])`
        );
    }

}
