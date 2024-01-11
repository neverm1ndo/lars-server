ip           (?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)
digit        [0-9]
esc          \\
int          \-?(?:[0-9]|[1-9][0-9]+)
exp          (?:[eE][-+]?[0-9]+)
frac         (?:\.[0-9]+)
time         ((час|секунд|минут)(а|ы|ов)?)
cli          [0-9]\.[0-9](\.|[a-zA-Z]+)\.?[0-9]?([a-zA-Z]+)?\.?([A-Z]+)?(\-[a-zA-Z0-9]+)?
str          (?=.*[a-zA-Zа-яА-Я])(?=.*[0-9])[a-zA-Zа-яА-Я0-9\_\!\?\.\-\s\[\]\|]+|[a-zA-Zа-яА-Я_\.\-]+

%%
\s+                 /* skip whitespace */
[0-9]{10}\b          return 'unix'
[0-9]{8}T[0-9]{6}\b  return 'date'
{time}               return 'time'
{ip}\b               return 'ip_address'
","                  return ','
"{"                  return '{'
"}"                  return '}'
":"                  return ':'
"<"                  return '<'
"/"                  return '/'
">"                  return '>'
"("                  return '('
")"                  return ')'
{cli}\b              return 'cli'
[0-9A-Z]{40}\b       return 'serial_ss'
{int}{frac}?\b       return 'number'
\'(?:\\[\"bfnrt/\\]|\\u[a-fA-F0-9]{4}|[^\"\\])*\' yytext = yytext.substr(1,yyleng-2); return 'message'
"из"                 return 'with'
"и"                  return 'and'
{str}                return 'string'
[a-zA-Za-яА-Я0-9_\[\]@#\$\(\)\!|\.]{1,18}?(?=\s)\b return 'nickname'
<<EOF>>              return 'EOF'