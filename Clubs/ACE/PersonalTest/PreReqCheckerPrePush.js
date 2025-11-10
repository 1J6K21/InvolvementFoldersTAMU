"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var assert = require("assert");
// --- Parse prereq file ---
function parsePrereq(filename, courseName) {
    try {
        var data = JSON.parse(fs.readFileSync(filename, "utf-8"));
        var classBucket = data[courseName];
        var prereqBuckets = classBucket["info"]["prereqs"];
        return prereqBuckets;
    }
    catch (e) {
        console.error("Error loading prereqs:", e);
        return false;
    }
}
// --- Evaluate recursively ---
function evaluateBucket(coursesTaken, coursesEnrolled, bucket) {
    //UNCOMMENT THIS LINE TO TRACE BUCKET CALLS
    // console.log("Evaluating bucket:", JSON.stringify(bucket, null, 2));
    if (typeof bucket === "string") {
        // return the raw token (".") or a boolean result
        return evaluateSingleRequirement(coursesTaken, coursesEnrolled, bucket);
    }
    if (typeof bucket === "boolean") {
        return bucket;
    }
    var evaluated = [];
    for (var _i = 0, bucket_1 = bucket; _i < bucket_1.length; _i++) {
        var element = bucket_1[_i];
        if (Array.isArray(element)) {
            evaluated.push(evaluateBucket(coursesTaken, coursesEnrolled, element));
        }
        else if (typeof element === "string") {
            evaluated.push(evaluateSingleRequirement(coursesTaken, coursesEnrolled, element));
        }
        else {
            evaluated.push(element);
        }
    }
    // Process ORs (".")
    while (evaluated.includes(".")) {
        var idx = evaluated.indexOf(".");
        var left = evaluated[idx - 1];
        var right = evaluated[idx + 1];
        evaluated.splice(idx - 1, 3, left || right);
    }
    // Remaining ANDs
    return evaluated.every(function (v) { return v === true; });
}
// --- Evaluate a single token like "CHEM107 C ^" ---
function evaluateSingleRequirement(coursesTaken, coursesEnrolled, token) {
    token = token.trim();
    // OR passthrough
    if (token === ".")
        return token;
    var pattern = /^([A-Z]{4}\d{3})\s*([A-F])?(?:\s*\^)?$/;
    var match = token.match(pattern);
    if (!match)
        return false;
    // match[1] and match[2] are present because pattern matched
    var courseCode = match[1];
    var minGrade = match[2] || "D";
    var requiredWithGrade = "".concat(courseCode, " ").concat(minGrade);
    var requiredConcurrent = "".concat(requiredWithGrade, " ^");
    var extractGrade = function (entry) {
        var _a;
        var parts = entry.trim().split(/\s+/);
        var last = (_a = parts[parts.length - 1]) !== null && _a !== void 0 ? _a : "";
        return /^[A-F]$/.test(last) ? last : null;
    };
    // --- 1️⃣ Concurrently enrolled (CHEM107 C ^) ---
    if (coursesEnrolled.includes(requiredConcurrent))
        return true;
    // --- 2️⃣ Already taken with sufficient grade ---
    for (var _i = 0, coursesTaken_1 = coursesTaken; _i < coursesTaken_1.length; _i++) {
        var taken = coursesTaken_1[_i];
        if (taken.startsWith(courseCode)) {
            var grade = extractGrade(taken);
            if (grade && grade <= minGrade)
                return true; // 'A' < 'C'
        }
    }
    // --- 3️⃣ Enrolled in the same course (not necessarily with ^) ---
    for (var _a = 0, coursesEnrolled_1 = coursesEnrolled; _a < coursesEnrolled_1.length; _a++) {
        var enrolled = coursesEnrolled_1[_a];
        if (enrolled.startsWith(courseCode))
            return true;
    }
    return false;
}
// --- Wrapper ---
function prereqchecker(coursesTaken, coursesEnrolled, prereqBucket) {
    return Boolean(evaluateBucket(coursesTaken, coursesEnrolled, prereqBucket));
}
// Dummy version to simulate your prereqchecker
function prereqcheckerDummy(a) {
    return a.includes("PASS");
}
// --- Example main ---
if (require.main === module) {
    var prereqBucket = parsePrereq("data_Spring2026_Prereq_test (1).json", "ECEN_403");
    if (prereqBucket) {
        console.assert(prereqchecker(["COMM205 C", "ECEN314 C", "ECEN325 C", "CSCE350 C", "ECEN303 C", "ECEN322 C", "ECEN370 C"], [], prereqBucket) === true);
        console.assert(prereqchecker(["ECEN314 C", "ECEN325 C", "CSCE350 C", "CSCE315 C", "ECEN303 C", "COMM205 C"], ["ECEN449 C ^"], prereqBucket) === true);
        console.assert(prereqchecker(["ECEN314 C", "ECEN325 C", "CSCE350 C", "CSCE315 C", "ECEN303 C"], ["ECEN449 C ^"], prereqBucket) === false);
    }
    var FINC_428_prereq_bucket = parsePrereq("data_Spring2026_Prereq_test (1).json", "FINC_428");
    if (FINC_428_prereq_bucket) {
        console.assert(prereqchecker([], [], FINC_428_prereq_bucket) === false);
        console.assert(prereqchecker(["FINC421 D", "FINC361 D"], ["ACCT328 D ^"], FINC_428_prereq_bucket) === true);
        console.assert(prereqchecker(["FINC421 D", "FINC361 D", "ACCT328 C"], [], FINC_428_prereq_bucket) === true);
        console.assert(prereqchecker(["FINC421 A", "FINC361 D"], ["ACCT328 ^"], FINC_428_prereq_bucket) === true);
    }
    var CSCE_421_prereq_bucket = parsePrereq("data_Spring2026_Prereq_test (1).json", "CSCE_421");
    if (CSCE_421_prereq_bucket) {
        console.assert(prereqchecker(["ECEN303 C", "CSCE120 C"], [], CSCE_421_prereq_bucket) === false);
    }
    // Load test data (adjust filename as needed)
    var CSCE_421_prereq_bucket2 = parsePrereq("data_Spring2026_Prereq_test (1).json", "CSCE_421");
    // ✅ Assertion 1 — should be false
    {
        var result = prereqchecker(["ECEN303 C", "CSCE120 C"], [], CSCE_421_prereq_bucket2);
        assert.strictEqual(result, false, "Expected false, got ".concat(result, " for prereqchecker([\"ECEN303 C\", \"CSCE120 C\"], [])"));
    }
    // ✅ Assertion 2 — should be false
    {
        var result = prereqchecker(["ECEN303 C", "CSCE120 C"], [], CSCE_421_prereq_bucket2);
        assert.strictEqual(result, false, "Expected true, got ".concat(result, " for prereqchecker([\"ECEN303 C\", \"CSCE120 C\", \"CSCE310 B\"], [])"));
    }
}
