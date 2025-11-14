"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs_1 = require("fs");
/**
 * Loads and parses prerequisite info from JSON file.
 */
function parsePrereq(filename, courseName) {
    try {
        var data = JSON.parse(fs_1.default.readFileSync(filename, "utf-8"));
        var classBucket = data[courseName];
        var prereqBuckets = classBucket["info"]["prereqs"];
        return prereqBuckets;
    }
    catch (err) {
        console.error("Error loading prereqs:", err);
        return false;
    }
}
/**
 * Recursively evaluates a prereq 'bucket' list.
 * Returns true or false.
 */
function evaluateBucket(coursesTaken, coursesEnrolled, bucket) {
    console.log("Evaluating bucket:", JSON.stringify(bucket, null, 2));
    // Base case: if it's a string
    if (typeof bucket === "string") {
        if (bucket == ".") {
            return false;
        }
        // at this point should only be boolean because we took care of string case
        return Boolean(evaluateSingleRequirement(coursesTaken, coursesEnrolled, bucket));
    }
    // Base case: if it's already boolean
    if (typeof bucket === "boolean") {
        return bucket;
    }
    // Recursive case: evaluate sub-buckets
    var evaluated = bucket.map(function (element) {
        if (Array.isArray(element)) {
            return evaluateBucket(coursesTaken, coursesEnrolled, element);
        }
        else if (typeof element === "string") {
            return evaluateSingleRequirement(coursesTaken, coursesEnrolled, element);
        }
        else {
            return element;
        }
    });
    // Process ORs (".") left to right
    while (evaluated.includes(".")) {
        var idx = evaluated.indexOf(".");
        var left = Boolean(evaluated[idx - 1]);
        var right = Boolean(evaluated[idx + 1]);
        evaluated.splice(idx - 1, 3, left || right);
    }
    // After ORs, all remaining are ANDs
    return evaluated.every(function (v) { return v === true; });
}
/**
 * Evaluates one course requirement token.
 * Supports course codes and those ending with ^ (in progress).
 */
function evaluateSingleRequirement(coursesTaken, coursesEnrolled, token) {
    var pattern = /^[A-Z]{4}\d{3}\s*[^\\^]*$/;
    var inProgressPattern = /^[A-Z]{4}\d{3}\s*[^\\^]*\^$/;
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
function prereqChecker(coursesTaken, coursesEnrolled, prereqBucket) {
    return evaluateBucket(coursesTaken, coursesEnrolled, prereqBucket);
}
// Example usage:
var prereqBucket = parsePrereq("data_Spring2026_Prereq_test (1).json", "ECEN_403");
if (prereqBucket === false) {
    process.exit(1);
}
console.assert(prereqChecker([
    "COMM205 C",
    "ECEN314 C",
    "ECEN325 C",
    "CSCE350 C",
    "ECEN303 C",
    "ECEN322 C",
    "ECEN370 C",
], [], prereqBucket) === true);
console.assert(prereqChecker([
    "ECEN314 C",
    "ECEN325 C",
    "CSCE350 C",
    "CSCE315 C",
    "ECEN303 C",
    "COMM205 C",
], ["ECEN449 C ^"], prereqBucket) === true);
console.assert(prereqChecker(["ECEN314 C", "ECEN325 C", "CSCE350 C", "CSCE315 C", "ECEN303 C"], ["ECEN449 C ^"], prereqBucket) === false);
console.log("All assertions passed.");
