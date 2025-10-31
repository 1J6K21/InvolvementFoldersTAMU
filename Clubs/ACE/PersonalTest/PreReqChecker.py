def parse_prereq(filename, course_name):
    #The bucket it returns is one big list for the key of the prereq
    #The list contains comma seperated ands, and "." value seperated ors

    import json
    try:
        with open(filename) as f:
            data = json.load(f)
            class_bucket= data[course_name]
            prereq_buckets = class_bucket["info"]["prereqs"]
            return prereq_buckets
    except:
        return False
    




def prereqchecker(courses_taken, courses_enrolled, prereq_bucket):
    for i, bucket in enumerate(prereq_bucket):
        if len(bucket) == 1 and type(bucket) == list:
            prereq_bucket = bucket = bucket[0]
        print(bucket)
        if type(bucket) != str and type(bucket) != bool:
            prereqchecker(courses_taken=courses_taken, courses_enrolled=courses_enrolled, prereq_bucket=bucket) #narrow bucket scope
            #when returned and back to this line, the bucket should be evaluated as a true or false
        if type(bucket) == bool:
            prereq_bucket = bucket
            continue
        elif type(bucket) == str:
            if bucket == ".":
                if prereq_bucket[i-1]: #potentially an early bail if lhs is true
                    prereq_bucket[i-1:i+2] = [True]
                continue#have to see if the other is true
            pattern = "[A-Z]{4}\\d{3}\\s*[^\\^]*"
            import re
            if re.match(pattern, bucket):
                #Check if class is in courses taken
                if bucket in courses_taken:
                    prereq_bucket[i] = True
                    continue #dont have to check currently enrolled
            
            if re.match(pattern + "\\^", bucket):
                #check if class is in currently enrolled courses
                prereq_bucket[i] = True if bucket in courses_enrolled else False
            else:
                prereq_bucket[i] = False # wasnt found in both
    
        # ind = [i for i, val in enumerate(prereq_bucket) if val == "."] # find all the or indicies
        nextIndx = next((i for i, t in enumerate(prereq_bucket) if t == "."), None)
        while nextIndx != None:
            prereq_bucket[nextIndx-1:nextIndx+2] = [prereq_bucket[nextIndx-1] or prereq_bucket[nextIndx+1]]
            # nextIndx = prereq_bucket.index(".")
            nextIndx = next((i for i, t in enumerate(prereq_bucket) if t == "."), None)

        prereq_bucket = all(prereq_bucket) # finally all the ands
    return prereq_bucket





if __name__ == "__main__":
    prereq_bucket = parse_prereq("data_Spring2026_Prereq_test (1).json","ECEN_403")
    import json
    print(json.dumps(prereq_bucket, indent=4))
    assert(prereqchecker(["COMM205 C", "ECEN314 C", "ECEN325 C", "CSCE350 C", "ECEN303 C", "ECEN322 C", "ECEN370 C"], [], prereq_bucket= [[True]]) == True)
    assert(prereqchecker(["COMM205 C", "ECEN314 C", "ECEN325 C", "CSCE350 C", "ECEN303 C", "ECEN322 C", "ECEN370 C"], [], prereq_bucket= prereq_bucket[:]) == True)
    assert(prereqchecker(["COMM205 C", "ECEN314 C", "ECEN325 C", "CSCE350 C", "CSCE315 C",  "ECEN303 C"], ["ECEN449 C ^"], prereq_bucket= prereq_bucket[:]) == True)
    assert(prereqchecker(["ECEN314 C", "ECEN325 C", "CSCE350 C", "CSCE315 C",  "ECEN303 C"], ["ECEN449 C ^"], prereq_bucket= prereq_bucket[:]) == True)