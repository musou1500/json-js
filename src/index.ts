import { equal, deepStrictEqual } from "assert";

function parse(source: string) {
  return new Parser(source).parse();
}

class Parser {
  private pos: number;

  constructor(private source: string) {
    this.pos = 0;
  }

  parse() {
    return this.parseElement();
  }

  parseString() {
    const chars = this.parseCharacters();
    if (this.consumeIfMatched("\"")) {
      return chars;
    }

    throw new Error(`unexpected char (pos:${this.pos})`);
  }

  parseCharacters(): string {
    let chars = "";
    while(!this.reachesEnd()) {
      try {
        chars += this.parseCharacter();
      } catch (e) {
        break;
      }
    }

    return chars;
  }

  parseCharacter(): string {
    const ch = this.source[this.pos];
    const charCode = ch.charCodeAt(0);
    const inRange = charCode >= 0x0020 && charCode <= 0x10ffff;
    const quoteOrBackSlash = ch === "\"" || ch === "\\";
    if (inRange && !quoteOrBackSlash) {
      this.pos++;
      return ch;
    } else if (this.consumeIfMatched("\\")) {
      return this.parseEscape();
    }

    throw new Error(`unexpected char (pos:${this.pos})`);
  }

  parseEscape(): string {
    const prefix = this.source[this.pos];
    this.pos++;
    switch(prefix) {
      case '"':
      case '\\':
      case '/':
        return prefix;
      case 'b': return "\b";
      case 'f': return "\f";
      case 'n': return "\n";
      case 'r': return "\r";
      case 't': return "\t";
      case 'u': {
        let code = "";
        for (let i = 0; i < 4; i++) {
          code += this.parseHex();
        }

        return String.fromCharCode(parseInt(code, 16));
      };
      default:
        throw new Error(`unexpected char (pos:${this.pos})`);
    }
  }

  parseHex(): string {
    const ch = this.source[this.pos];
    if (ch >= "A" && ch <= "F" || ch >= "a" && ch <= "f") {
      this.pos++;
      return ch;
    } else {
      return this.parseDigit();
    }
  }

  parseDigit(): string {
    if (this.source[this.pos] === "0") {
      this.pos++;
      return "0";
    } else {
      return this.parseOneNine();
    }
  }

  parseOneNine() {
    const ch = this.source[this.pos];
    if (ch >= "1" && ch <= "9") {
      this.pos++;
      return ch;
    }

    throw new Error(`unexpected char (pos:${this.pos})`);
  }

  parseObject(): { [k: string]: any } {
    this.skipWs();
    if (this.consumeIfMatched("}")) {
      this.pos++;
      return {};
    } else {
      return this.parseMembers();
    }
  }

  parseMembers(): { [k: string]: any } {
    const members = {};
    do {
      Object.assign(members, this.parseMember());
    } while (this.consumeIfMatched(","))

    return members;
  }

  parseMember(): { [k: string]: any } {
    this.skipWs();
    if (!this.consumeIfMatched("\"")) {
      throw new Error(`unexpected char (pos:${this.pos})`);
    }

    const key = this.parseString();
    this.skipWs();

    if (this.consumeIfMatched(":")) {
      return {
        [key]: this.parseElement()
      }
    }

    throw new Error(`unexpected char (pos:${this.pos})`);
  }

  parseArray(): Array<any> {
    this.skipWs();
    if (this.consumeIfMatched("]")) {
      this.pos++;
      return [];
    } else {
      return this.parseElements();
    }
  }

  skipWs() {
    while (!this.reachesEnd() && this.isWs(this.source[this.pos])) {
      this.pos++;
    }
  }

  reachesEnd() {
    return this.pos >= this.source.length;
  }

  parseElements() {
    const elements = [];
    do {
      elements.push(this.parseElement());
    } while (this.consumeIfMatched(","))

    return elements;
  }

  parseElement() {
    this.skipWs();
    const element = this.parseValue();
    this.skipWs();
    return element;
  }

  parseValue() {
    if (this.consumeIfMatched("[")) {
      return this.parseArray();
    } else if (this.consumeIfMatched("{")) {
      return this.parseObject();
    } else if (this.consumeIfMatched("\"")) {
      return this.parseString();
    } else {
      return this.parseEtc();
    }
  }

  parseEtc() {
    const others: { [k: string]: boolean | null } = {
      "true": true,
      "false": false,
      "null": null
    };

    for (let k in others) {
      if (this.consumeIfMatched(k)) {
        return others[k];
      }
    }

    throw new Error(`unexpected char (pos:${this.pos})`);
  }

  consumeIfMatched(str: string) {
    if(this.source.startsWith(str, this.pos)) {
      this.pos += str.length;
      return true;
    }

    return false;
  }

  isWs(ch: string) {
    const wsCharCodes = [
      0x0009,
      0x000A,
      0x000D,
      0x0020
    ];

    return ch.length > 0 && wsCharCodes.includes(ch.charCodeAt(0));
  }
}

[
  "true",
  "false",
  "null",
  "[]",
  "[true, false, null, \"\\u1234abc\"]",
  "\"abcd\"",
  "\"a\\nb\"",
  "\"\\u1234abc\"",
  "{ \"str\": \"\\u1234abc\", \"arr\": [true, false, null, \"\\u1234abc\"] }",
].forEach(input => {
  const actual = parse(input);
  console.log(input, "=>", actual);
  deepStrictEqual(actual, JSON.parse(input));
});

console.log("passed!");