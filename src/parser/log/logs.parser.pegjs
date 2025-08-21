start
    = logline

logline
    =
    	unix:unix
        ws
        date:date
        ws
        process:process
        nickname:nickname 
        id:id?
        numbers:numbers?
       	admin:admin?
        message:message?
        geo:geo_object?
        	{ 
            	const line = { unix, date, process, nickname, id, admin, message, geo, numbers };
            	
                for (const prop in line) {
                	if (line[prop] === null) delete line[prop];
                }
                
                return line;
            }
    
unix
	= unix:number { return unix }
    
date
	= number "T" number { return text() }
    
geo_object =
	object:object {
    	object.as = parseInt(object.as);
        object.country = object.props[0];
        
        delete object.props;

        return object;
    }

begin_object      = ws "{" ws
end_object        = ws "}" ws
name_separator    = ws ":" ws
value_separator   = ws "," ws
process_separator = "/"
begin_process     = ws "<" ws
end_process       = ws ">" ws
begin_id          = ws "(" ws
end_id            = ws ")" ws

ws "whitespace" = [ \t\n\r]*

space "space"
	= " "

// Tokens

process = begin_process head:word tail:(process_separator word)* end_process { 
    return [head, ...tail.flat()].join('');
}

nickname
    = $[a-zA-Za-яА-Я0-9_\[\]@#\$\(\)\!\|\.]i+
    
id
	= begin_id @number end_id
    
admin
	= role:word ws nickname:nickname ws id:id { 
        return { role, nickname, id }
    }

// Numbers

number "number"
    = minus? int frac? { 
        return parseFloat(text()); 
    }

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
    
numbers
	= number (ws number) { return text(); }

// Strings

word "word"
	= $[a-zA-Zа-яА-Я]i+
    
ipv4
  = int ("." int)+ {
      return text();
    }

string "string"
  = chars:char* { return chars.join(""); }

message "message"
    = quotation_mark @string quotation_mark

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


// Object

object
 = begin_object 
   members:(
    head: object_member
    tail: (value_separator @object_member)*
    {
        return [head, ...tail].reduce((acc, curr) => {
        	if (typeof curr === 'string') {
            	if (!acc.props) acc.props = [];
            	acc.props.push(curr);
            	
                return acc;
            }
            
            return { ...acc, ...curr };
        }, {})
    }
   )?
   end_object {
        return members !== null ? members: {};
 }

object_member
 = key:word name_separator value:object_value {
    return { [key]: value }
 }
 / value:object_value { return value }

object_value
  = [^,\\{\\}]* { return text(); };

// ----- Core ABNF Rules -----

// See RFC 4234, Appendix B (http://tools.ietf.org/html/rfc4234).
DIGIT  = [0-9]
HEXDIG = [0-9a-f]i