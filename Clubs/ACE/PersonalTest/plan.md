exTxt = "Prerequisite: Grade of C or better in MATH 142, MATH 147, MATH 151, or MATH 171, or concurrent enrollment. Concurrent enrollment in CHEM 117; Cross Listing: ECEN 222/CSCE 222."

target = "STAT 211"


Stat 211:

[COURSES]
└──> [STAT 211] #This course is a Document adjacent to other course collections
        --(prereq)--> #Document Prereqs
            [OR] #OR is a collection, and we only need one of the following documents
            ├──> [MATH 142] #Document
            ├──> [MATH 147] #Document
            ├──> [MATH 151] #Document
            └──> [MATH 171] #Document
        --(concurrent)--> #Document concurrent
            [WITH] #WITH is a collection implying only one was mentioned(otherwise [AND] or [OR])
            └──> [CHEM 117] #Document
        --(cross)--> #Collection of Crossreferenced classes
            └──> [ECEN 222] #Document
            └──> [CSCE 222] #Document


#EDGE CASE

MATH 304, CSCE 310
"; junior or senior classification;"

#Test case

CSCE 315: 
Prerequisite: CSCE 312 and CSCE 314, or CSCE 350/ECEN 350 or ECEN 350/CSCE 350; concurrent enrollment in CSCE 313.



Initial:
Prerequisite: Grade of C or better in CSCE 314, CSCE 350/ECEN 350, or ECEN 350/CSCE 350; grade of C or better or concurrent enrollment in CSCE 313.

STEP 1: SPLIT: 
/**
* Split at: [, ; : ]
/

[ 
    Prerequisite,
    Grade of C or better in CSCE 314,
    CSCE 350/ECEN 350,
    or ECEN 350/CSCE 350
    grade of C or better or concurrent enrollment in CSCE 313
]

STEP 2: SPLIT at OR 

[ 
    Prerequisite,
    [Grade of C ]or [better in CSCE 314],
    CSCE 350/ECEN 350,
    or [ECEN 350/CSCE 350],
    [grade of C ]or [[better] or [concurrent enrollment in CSCE 313]]
]

DF erase none digit elements
[ 
    or [better in CSCE 314],
    CSCE 350/ECEN 350,
    or [ECEN 350/CSCE 350],
    or [concurrent enrollment in CSCE 313]
]

replace / into a [,]
[ 
    or [better in CSCE 314],
    [CSCE 350,ECEN 350],
    or [[ECEN 350,CSCE 350]],
    or [concurrent enrollment in CSCE 313]
]

keep only course, if And combine into one list, unmodify concurrent, classification, or cross reference statements

[ 
    [CSCE 314],
    [CSCE 350,ECEN 350],
    [[ECEN 350,CSCE 350]],
    [concurrent enrollment in CSCE 313]
]

everything is prereq, extract statements above into independent list

prereq = [ 
    [CSCE 314],
    [[CSCE 350,ECEN 350]],
    [[ECEN 350,CSCE 350]],
]

-> [concurrent enrollment in CSCE 313] -> extract courses -> [CSCE 313]
concurrent = [
    CSCE 313
]

REMEMBER IT WAS: Prerequisite: Grade of C or better in CSCE 314, CSCE 350/ECEN 350, or ECEN 350/CSCE 350; grade of C or better or concurrent enrollment in CSCE 313.

everytime you add a list its an or.

Currently it translates to:

[COURSES]
└──> [COURSE] #This course is a Document adjacent to other course collections
        --(prereq)--> #Document Prereqs
            [OR] #OR is a collection, and we only need one of the following documents
            ├──> [CSCE 314] #Document
            [OR] #OR is a collection, and we only need one of the following documents
                [OR]
                ├──>[CSCE 350]
                ├──>[ECEN 350]
            [OR] ??
            ├──>[OR]
                ├──>[ECEN 350]
                ├──>[CSCE 350]
        --(concurrent)--> #Document concurrent
            [WITH] #WITH is a collection implying only one was mentioned(otherwise 
            └──> [CSCE 313] #Document
            [AND] or [OR])






EXAMPLE 2:
Prerequisite: CSCE 312 and CSCE 314, or CSCE 350/ECEN 350 or ECEN 350/CSCE 350; concurrent enrollment in CSCE 313.

Prereq = [
    [CSCE 312 and CSCE 314],
    [or CSCE 350/ECEN 350 or ECEN 350/CSCE 350],
    [concurrent enrollment in CSCE 313]
]

STEP 2: REDUCE WORDS
#replace elements with proper 
Prereq = [
    (CSCE 312, CSCE 314),
    [CSCE 350/ECEN 350, ECEN 350/CSCE 350], #ignore empty left of or
    ~~[concurrent enrollment in CSCE 313]~~ #type concurrent
]

concurrent = [
    CSCE 313
]


END OF LAST STEP
Prereq = [
    (CSCE 312, CSCE 314),
    [[CSCE 350,ECEN 350], [ECEN 350,CSCE 350]], 
]

concurrent = [
    CSCE 313
]


// 
Prereq = [
    AND[CSCE 312, CSCE 314],
   OR[OR[CSCE 350,ECEN 350], OR[ECEN 350,CSCE 350]], 
]

concurrent = [
    CSCE 313
]
----------------------------------------------------------------
Make an enum:
enum{
    AND
    OR
    PREREQ
    CONCURRENT
    CROSS
    CLASS
}
Make a class{
    type : eypeEnum
    list [] 
}
----------------------------------------------------------------
EXAMPLE 2 REDONE:
Prerequisite: CSCE 312 and CSCE 314, or CSCE 350/ECEN 350 or ECEN 350/CSCE 350; concurrent enrollment in CSCE 313.

[CSCE 312 and CSCE 314 ] [or CSCE 350/ECEN 350 or ECEN 350/CSCE 350] [concurrent enrollment in CSCE 313]

prereq = [
    AND(CSCE 312,CSCE 314),
    OR(OR(CSCE 350,ECEN 350), OR(ECEN 350,CSCE 350))
]
concurrent = [
    CSCE 313
]

--> poll the first. Its an And

[COURSE]
    [AND]-->