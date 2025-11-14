import sys
import argparse
from pathlib import Path

# Add parent directory to path so we can import from prereq_checker
sys.path.insert(0, str(Path(__file__).parent.parent))
from prereq_checker import prereqchecker, parse_prereq, saveCoursesTaken, getCoursesTaken, updateTaken

# Use absolute path relative to this script's location
script_dir = Path(__file__).parent
courses_file = script_dir / "coursesTaken.json"
prereq_data_file = script_dir.parent / "data_Spring2026_Prereq_test (1).json"


def cmd_check(args):
    """Check if prerequisites are met for a course"""
    coursesTaken, coursesEnrolled = getCoursesTaken(str(courses_file))
    if coursesTaken is False:
        print("Error: Could not load courses file")
        return
    
    course_name = args.course.upper().replace(" ", "_")
    prereq_bucket = parse_prereq(str(prereq_data_file), course_name)
    
    if prereq_bucket is False:
        print(f"Error: Could not find prerequisites for {course_name}")
        return
    
    can_take = prereqchecker(coursesTaken, coursesEnrolled, prereq_bucket)
    print(f"\n{course_name} {'can be taken' if can_take else 'can NOT be taken'}")


def cmd_update_taken(args):
    """Add courses to the taken list"""
    courses = [c.upper().replace(" ", "_") for c in args.courses]
    if updateTaken(str(courses_file), courses):
        print(f"Successfully added: {', '.join(courses)}")
    else:
        print("Error updating courses")


def cmd_list(args):
    """List all taken and enrolled courses"""
    coursesTaken, coursesEnrolled = getCoursesTaken(str(courses_file))
    if coursesTaken is False:
        print("Error: Could not load courses file")
        return
    
    print("\nCourses Taken:")
    for course in coursesTaken:
        print(f"  - {course}")
    
    print("\nCurrently Enrolled:")
    for course in coursesEnrolled:
        print(f"  - {course}")


def main():
    parser = argparse.ArgumentParser(description="Course Prerequisite Checker")
    subparsers = parser.add_subparsers(dest="command", help="Available commands")
    
    # Check command
    check_parser = subparsers.add_parser("check", help="Check if you can take a course")
    check_parser.add_argument("course", help="Course code (e.g., CSCE_222 or 'CSCE 222')")
    check_parser.set_defaults(func=cmd_check)
    
    # Update taken command
    update_parser = subparsers.add_parser("updateTaken", help="Add courses to taken list")
    update_parser.add_argument("courses", nargs="+", help="Course codes to add")
    update_parser.set_defaults(func=cmd_update_taken)
    
    # List command
    list_parser = subparsers.add_parser("list", help="List all courses")
    list_parser.set_defaults(func=cmd_list)
    
    args = parser.parse_args()
    
    if args.command is None:
        parser.print_help()
    else:
        args.func(args)


if __name__ == "__main__":
    main()
