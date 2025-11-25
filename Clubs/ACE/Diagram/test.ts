import { parsePrereqs } from "./prereq-viewer/src/diagram_parser";
import * as fs from "fs";

export function coursePreReqFromFile(
  filename: string,
  courseName: string
): any[] | false {
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


function main() {
  try {
    const prereq: any[] =
      coursePreReqFromFile(
        "data_Spring2026_Prereq_test (1).json",
        "CSCE_120"
      ) || [];
    const result = parsePrereqs(prereq);
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error(err);
  }
}

main();
