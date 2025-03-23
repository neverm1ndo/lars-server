// GTA-Liberty logs grammar

ws "whitespace" = [\t\n\r]*

start
    = logline:logline

logline
    = number

begin_object  = ws "{" ws
end_object    = ws "}" ws
begin_process = ws "<" ws
end_process   = ws ">" ws
begin_id      = ws "(" ws
end_id        = ws ")" ws


// Tokens

// Numbers

number "number"
    = minus? int frac? { return parseFloat(text()); }

decimal_point
    = "."

digits
    = [1-9]

frac
    = decimal_point DIGIT+

int
    = zero / (digits DIGIT*)

minus
    = "-"

plus
    = "+"

zero
    = "0"

// Strings

message "message"
    = quotation_mark


quotation_mark
    = "'"

DIGIT  = [0-9]