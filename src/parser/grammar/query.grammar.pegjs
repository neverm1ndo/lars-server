// Search query grammar
// =================

// ---------- Mapping -----------
// username string
// ip string
// serial {
//    as int
//    ss string
//    cn string
// }
// ban {
//    nickname string
//    reason int
//    ip string
//    serial {
//      as int
//      ss string
//      cn string
//    }
// }
// client {
//    version string   
// }
// acheat {
//    type string   
// }
// chat {
//    message string   
// }
// gun {
//   id int   
// }

// ---------- Query Grammar ------

// Query_text 
//     = ws.value: value ws { return value; }



begin_array       = ws "[" ws
begin_object      = ws "{" ws
end_array         = ws "]" ws
end_object        = ws "}" ws
name_separator    = ws ":" ws
value_separator   = ws "," ws
equality_operator = ws "==" ws
and_operator      = ws "&&" ws

ws "whitespace" = [ \t\n\r]*

// ----- 3. Values -----

// value
//   = false
//   / null
//   / true
//   / object
//   / array
//   / number
//   / string

// false = "false" { return false; }
// null  = "null"  { return null;  }
// true  = "true"  { return true;  }

// ----- 4. Objects -----