start
    = ws logline:logline ws

logline
    = 
    	unix:unix
        date:date
        process:process
        nickname:nickname 
        id:id?
       	admin:admin?
        message:message?
        	{ return { unix, date, process, nickname, id, admin, message }}
    
unix
	= unix:number { return unix }
    
date
	= ws head:number delimiter:"T" tail:number { return `${head}${delimiter}${tail}`}

begin_object  = ws @"{" ws
end_object    = ws @"}" ws
begin_process = ws @"<" ws
end_process   = ws @">" ws
begin_id      = ws @"(" ws
end_id        = ws @")" ws

ws "whitespace" = [ \t\n\r]*

space "space"
	= " "

// Tokens

process = ws start:begin_process head:word tail:("/" word)* end:end_process { return [start, head, ...tail.flat(), end].join('') } 

nickname
    = $[a-zA-Za-яА-Я0-9_\[\]@#\$\(\)\!\|\.]i+
    
id
	= begin_id @number end_id
    
admin
	= role:word ws nickname:nickname ws id:id { return { role, nickname, id }}

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
	= $[a-zA-Zа-яА-Я]i+

message "message"
    = quotation_mark chars:char* quotation_mark { return chars.join('') }


quotation_mark
    = "'"

char
  = unescaped
  / escape
    sequence:(
        '"'
      / "\\"
      / "/"
      / "b" { return "\b"; }
      / "f" { return "\f"; }
      / "n" { return "\n"; }
      / "r" { return "\r"; }
      / "t" { return "\t"; }
      / "u" digits:$(HEXDIG HEXDIG HEXDIG HEXDIG) {
          return String.fromCharCode(parseInt(digits, 16));
        }
    )
    { return sequence; }

escape
  = "\\"

unescaped
  = [^\0-\x1F\x22\x5C]

// ----- Core ABNF Rules -----

// See RFC 4234, Appendix B (http://tools.ietf.org/html/rfc4234).
DIGIT  = [0-9]
HEXDIG = [0-9a-f]i