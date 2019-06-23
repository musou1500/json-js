# json-js
json parser implemented by JavaScript

```
true => true
false => false
null => null
[] => []
[true, false, null, "\u1234abc"] => [ true, false, null, 'ሴabc' ]
"abcd" => abcd
"a\nb" => a
b
"\u1234abc" => ሴabc
{ "str": "\u1234abc", "arr": [true, false, null, "\u1234abc"] } => { str: 'ሴabc', arr: [ true, false, null, 'ሴabc' ] }
0 => 0
-123 => -123
123 => 123
123e2 => 12300
123e-2 => 1.23
```
