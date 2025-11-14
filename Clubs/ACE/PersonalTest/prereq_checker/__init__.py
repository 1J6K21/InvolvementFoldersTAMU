"""
Course Checker Package
"""

# Defines this package and where to get the definitions
from prereq_parser.CourseParser8 import parse_prerequisites
from CommandLine.CoursesTaken import (
    getCoursesTaken,
    saveCoursesTaken,
    updateTaken,
    updateEnrolled,
    updateTakenEnrolled
)
from prereq_checker.prerecqchecker2 import (
    prereqchecker,
    parse_prereq
)

# When importing all these will be imported
__all__ = [
    'parse_prerequisites',
    'prereqchecker',
    'parse_prereq',
    'getCoursesTaken',
    'saveCoursesTaken',
    'updateTaken',
    'updateEnrolled',
    'updateTakenEnrolled'
]