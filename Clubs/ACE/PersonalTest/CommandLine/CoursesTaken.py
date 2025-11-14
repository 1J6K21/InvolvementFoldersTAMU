import json

def getCoursesTaken(filename):
    with open(filename, "r") as f:
        try:
            data = json.load(f)
            classes_taken = data["taken"]
            classes_enrolled = data["enrolled"]
            return (classes_taken, classes_enrolled)
        except Exception as e:
            print(f"error loading classes history: {e}")
            return False
        
def saveCoursesTaken(filename, taken, enrolled):
    try:
        with open(filename, "w") as f:
            data = {"taken": taken, "enrolled": enrolled}
            json.dump(data, f, indent=4)
        return True
    except Exception as e:
        print(f"error saving json {e}")
        return False

def updateTaken(filename, newTaken):
    try:
        taken, enrolled = getCoursesTaken(filename)
        if taken is False:
            return False
        taken.extend(newTaken)
        return saveCoursesTaken(filename, taken, enrolled)
    except Exception as e:
        print(f"error updating classes: {e}")
        return False

def updateEnrolled(filename, newEnrolled):
    try:
        taken, enrolled = getCoursesTaken(filename)
        if enrolled is False:
            return False
        enrolled.extend(newEnrolled)
        return saveCoursesTaken(filename, taken, enrolled)
    except Exception as e:
        print(f"error updating classes: {e}")
        return False

def updateTakenEnrolled(filename, newTaken=[], newEnrolled=[]):
    try:
        taken, enrolled = getCoursesTaken(filename)
        if taken or enrolled is False:
            return False
        taken.extend(newTaken)
        enrolled.extend(newEnrolled)
        return saveCoursesTaken(filename, taken, enrolled)
    except Exception as e:
        print(f"error updating classes: {e}")
        return False




