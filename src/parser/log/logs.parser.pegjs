// GTA-Liberty logs grammar

start
    = ws @logline:logline ws

begin_object  = ws @"{" ws
end_object    = ws @"}" ws
begin_process = ws @"<" ws
end_process   = ws @">" ws
begin_id      = ws @"(" ws
end_id        = ws @")" ws

ws "whitespace" = [ \t\n\r]*

// Tokens

process = ws start:begin_process head:word tail:("/" word) end:end_process { return [start, head, ...tail, end].join('') }

logline
    = unix:unix date:date process:process { return { unix, date, process }}
    
unix
	= unix:number { return unix }
    
date
	= ws head:number delimiter:"T" tail:number { return `${head}${delimiter}${tail}`}

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

word "word"
	= $[a-z]i+

message "message"
    = quotation_mark


quotation_mark
    = "'"

DIGIT  = [0-9]