/* description: parses liberty server logs */
/* 
  To build parser:

    $ jison /log.parser.jison /log.parser.jisonlex 

*/

/* author: neverm1ndo */

%{
    function ofDate(unix){ 
      return new Date(unix*1000);
    }
%}

%{
    function trim(value){ 
      return value.trim();
    }
%}

/* lexical grammar */
%start log_text

%% 

/* log grammar */

log_text
    : log_head log_body EOF
        { return Object.assign($log_head, $log_body); }
    | log_head EOF
        { return $$ }
    ;

log_head
    : unix date log_process string log_userid 
        { 
            $$ = { 
                unix    : parseInt($unix),
                date    : ofDate($unix),
                process : $log_process,
                nickname: trim($string),
                id      : $log_userid 
            }
        }
    | unix date log_process string 
        {
            $$ = {
                unix    : parseInt($unix),
                date    : ofDate($unix),
                process : $log_process,
                nickname: trim($string),
                id      : undefined
            }
        }
    ;

log_body
    : geo_country_object 
        { $$ = { geo: $geo_country_object } }
    | geo_object_no_country 
        { $$ = { content: $geo_object_no_country } }
    | message geo_text
        { 
            $$ = { 
                content: {
                    auth: {
                        username: $message
                    }
                },
                geo: $geo_text
            }
        }
    | geo_element message geo_text 
        {
            $$ = {
                content: {
                    auth: {
                        username: $message,
                        ...$geo_element
                    }
                },
                geo: $geo_text
            }
        }
    | log_content
        {
            $$ = {
                content: $log_content
            }
        }
    | log_content geo_text
        {
            $$ = {
                content: $log_content,
                geo: $geo_text
            }
        }
    | geo_element
        {
            $$ = {
                content: {
                    props: $geo_element
                }
            }
        }
    | geo_element message
        {
            $$ = {
                content: {
                    props: $geo_element,
                    message: $message
                }
            }
        }
    ;

geo_object_no_country
    : '{' geo_element_list '}' 
        { $$ = $geo_element_list }
    ;

log_process
    : '<' log_process_element '>'
        { $$ = [$1, ...$2, $3].join('') }
    ;

log_process_element
    : string
        { $$ = $1 }
    | string '/' log_process_element
        { $$ = [$1, ...$2, $3].join('') }
    ;

log_userid
    : '(' number ')'
        { $$ = parseInt($number) }
    ;

log_content
    : message
        { $$ = { message: $1 }}
    | log_content_time
        { $$ = $1 }
    | log_number_tuple
        { $$ = { numbers: $1 } }
    | log_string_tuple 
        { $$ = { message: $log_string_tuple.join(' ') }}
    | string log_userid
        { 
            $$ = { 
                target: {
                    id: $log_userid,
                    username: trim($string)
                }
            }
        }
    | string log_userid with message
        { $$ = { op: trim($string), oid: $log_userid, message: $message } }
    | string log_userid string
        { 
            $$ = { 
                targetType: $3,
                target: {
                    id: $2,
                    username: trim($1)
                }
            }
        }
    | string log_userid message
        { $$ = { op: trim($1), oid: $log_userid, message: $message } }
    ;

log_content_time
    : time_expression
        { $$ = { time: $time_expression } }
    | time_expression message 
        { $$ = { time: $time_expression, message: $message } }
    ;

time_expression
    : time_expression_unit
        { $$ = $1 }
    | time_expression_unit ',' time_expression
        { $$ = [$1, $3].join(' ') }
    ;

time_expression_unit
    : number time
        { $$ = [$1, $2].join(' ')}
    | number time and number time 
        { $$ = [$1, $2, $4, $5].join(' ') }
    ;

log_number_tuple
    : number
        { $$ = [parseFloat($number)] }
    | number log_number_tuple
        { $$ = [parseFloat($number), ...$log_number_tuple] }
    ;

log_string_tuple
    : string
        { $$ = [$string] }
    | string log_string_tuple
        { $$ = [$string, ...$log_string_tuple] }
    ;

geo_text
    : geo_value
        { $$ = $1 }
    ;

geo_value
    : geo_country_object
        { $$ = $1 }
    ;

geo_element
    : string ':' geo_element_value
        { $$ = { [$string]: $3 } }
    | string ':' geo_text
        { $$ = $3 }
    ;

geo_element_value
    : ip_address
        { $$ = $ip_address }
    | serial_ss
        { $$ = $serial_ss }
    | string
        { $$ = $string.trim() }
    | cli
        { $$ = $cli }
    | number
        { $$ = parseFloat($number) }
    ;

geo_element_list
    : geo_element
        { $$ = $1 }
    | geo_element ',' geo_element_list
        {
            $$ = {
                ...$geo_element,
                ...$geo_element_list
            }
        }
    ;

geo_country_object
    : '{' string ',' geo_element_list '}'
        {
            $$ = {
                country: $2,
                ...$4
            }
        }
    ;