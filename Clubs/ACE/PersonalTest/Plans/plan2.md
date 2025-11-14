Exceptions:
##Like in Chemistry, we have rules but then excpetions. Its rather guidelines compared to laws/rules.

1. The term Grade will cancel one of the next and following (or, and,/)
2. (And/or) coming after punctuation (.,;:)


Process:

Step 1: Tokens:
map string to keep ("Pre", "or", "and", "/", "cross", "concurrent", and "\\W{4} \\d{3}")



Exaple:

Step 1: Tokens:
"Prerequisite: Grade of C or better in MATH 142, MATH 147, MATH 151, or MATH 171, or concurrent enrollment. Concurrent enrollment in CHEM 117; Cross Listing: ECEN 222/CSCE 222."
|
|-->    ["Pre", "Grade", "or", "MATH 142", "MATH 147", "MATH 151", "or", "MATH 171", "or", "concurrent", "Concurrent", "CHEM 117", "Cross", "ECEN 222/CSCE 222"]


Step 2: Clear 1:
["Pre", ~~"Grade", "or"~~, "MATH 142", "MATH 147", "MATH 151", "or", "MATH 171", "or", "concurrent", "Concurrent", "CHEM 117", "Cross", "ECEN 222/CSCE 222"]

Step 3: Bucket
Pre = []
Concurrent = []
Cross = []

[***"Pre"***, **"MATH 142"**,"MATH 147", "MATH 151", ***"or"***, "MATH 171", "or", "concurrent", "Concurrent", "CHEM 117", "Cross", "ECEN 222/CSCE 222"]

Left => "Pre"   Right => or
currBucket = Pre
currentList = Or
#Open an or
.
.
.
[MATH 141, MATH 147, MATH 151, MATH 171]

["Pre", "MATH 142","MATH 147", "MATH 151", ***"or"***, **"MATH 171"**, ***"or"***, "concurrent", "Concurrent", "CHEM 117", "Cross", "ECEN 222/CSCE 222"]

#2 of (or, and,/) (left and right) ==> close the OR and add 
Pre = [OR(MATH 141, MATH 147, MATH 151, MATH 171)]


TEST------------------------------------------------------------------------------------------------------------

"Prerequisites: MATH 221, MATH 251, or MATH 253; MATH 308 or concurrent enrollment; junior or senior classification or approval of instructor."

[Prerequisites, MATH 221, MATH 251, or, MATH 253, MATH 308, or, concurrent]


[ ["Senior] ] + [Junior] =