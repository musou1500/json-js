import {equal, deepStrictEqual, fail} from 'assert';
import {parse, UnexpectedChar} from './index';
import * as fs from 'fs';

function testBasic() {
  [
    'true',
    'false',
    'null',
    '[]',
    '[true, false, null, "\\u1234abc"]',
    '"abcd"',
    '"a\\nb"',
    '"\\u1234abc"',
    '{ "str": "\\u1234abc", "arr": [true, false, null, "\\u1234abc"] }',
    '0',
    '-123',
    '123',
    '123e2',
    '123e-2',
  ].forEach(input => {
    const actual = parse(input);
    deepStrictEqual(actual, JSON.parse(input));
  });
}

function surrogate(str: string): string {
  let output = '';
  let code = 0;
  for (let i = 0; i < str.length; i++) {
    code = str.charCodeAt(i);
    if (code < 0x80) {
      output += String.fromCharCode(code);
    } else {
      output += '\\u' + ('0000' + code.toString(16)).substr(-4);
    }
  }
  return output;
}


// copied from json-test-suite/generate.ts
function initArray(size: number, exec: (index: number) => any): any[] {
  const output = new Array(size);
  for (let i = 0; i < size; i++) {
    output[i] = exec(i);
  }
  return output;
}

function initObject(
  size: number,
  key: (index: number) => any,
  exec: (index: number) => any,
): any {
  const output: any = {};
  for (let i = 0; i < size; i++) {
    output[key(i)] = exec(i);
  }
  return output;
}

function initDeepObject(deep: number, value: any): any {
  const root: any = {};
  let output: any = root;
  let i = 0;
  for (; i < deep; i++) {
    output[i] = {};
    output = output[i];
  }
  output[i] = value;
  return root;
}

function initDeepArray(deep: number, value: any): any {
  const root: any[] = [];
  let output: any[] = root;
  let i = 0;
  for (; i < deep; i++) {
    output.push([]);
    output = output[0];
  }
  output.push(value);
  return root;
}

function initNestArray(deep: number, size: number, value: any, curr = 0): any {
  const output = new Array(deep);
  if (curr === deep) {
    for (let i = 0; i < size; i++) {
      output[i] = value;
    }
  } else {
    for (let i = 0; i < size; i++) {
      output[i] = initNestArray(deep, size, value, curr + 1);
    }
  }
  return output;
}

function initNestObject(deep: number, size: number, value: any, curr = 0): any {
  const output: any = {};
  if (curr === deep) {
    for (let i = 0; i < size; i++) {
      output[i] = value;
    }
  } else {
    for (let i = 0; i < size; i++) {
      output[i] = initNestObject(deep, size, value, curr + 1);
    }
  }
  return output;
}

const correct: any = {
  integer_positive_max: Number.MAX_SAFE_INTEGER,
  integer_negative_max: -Number.MAX_SAFE_INTEGER,
  integer_0: 0,
  float_positive_max: Number.MAX_VALUE,
  float_positive_min: Number.MIN_VALUE,
  float_negative_max: -Number.MAX_VALUE,
  float_negative_min: -Number.MIN_VALUE,
  null: null,
  true: true,
  false: false,
  string_0: '',
  string_1_normal: 'A',
  string_1_escape: '\n',
  string_1_unicode_base: '中',
  string_1_unicode_base_surrogate: '中',
  string_1_unicode_high: '😂',
  string_1_unicode_high_surrogate: '😂',
  string_100_normal: 'A'.repeat(100),
  string_100_escape: '\n\t\r\f\b\\/"'.repeat(15),
  string_100_unicode_base: '中'.repeat(100),
  string_100_unicode_high: '😀'.repeat(100),
  string_100_unicode_high_surrogate: '😀'.repeat(100),
  string_long_mangled: 'A\r\t\n中\b😀/true/false"...'.repeat(10000),
  string_long_mangled_surrogate: 'A\r\t\n中\b😀/true/false"...'.repeat(10000),
  array_0: [],
  array_null: [null],
  array_deep_0: [[]],
  array_deep_null: [[null]],
  array_deep100_null: initDeepArray(100, null),
  array_deep100_2: [initDeepArray(100, null), initDeepArray(100, null)],
  array_100_integer: initArray(100, i => i),
  array_100_string: initArray(100, i => i.toString()),
  array_100_deep_0: initArray(100, () => []),
  array_100_deep_integer: initArray(100, () => initArray(100, i => i)),
  array_100_deep_string: initArray(100, () =>
    initArray(100, i => i.toString()),
  ),
  object_0: {},
  object_null: {null: null},
  object_empty_key: {'': null},
  object_100_null: initObject(100, i => i, () => null),
  object_100_integer: initObject(100, i => i, i => i),
  object_deep_null: initObject(
    100,
    i => i,
    () => initObject(100, i => i, () => null),
  ),
  object_deep100_null: initDeepObject(100, null),
  big_array_5_5: initNestArray(5, 7, null),
  big_object_5_5: initNestObject(5, 7, null),
  nested: {
    integer: Number.MAX_SAFE_INTEGER,
    float: Number.MAX_VALUE,
    null: null,
    true: true,
    false: false,
    string: 'hello world\r\b\t\r\f\\"',
    array: [1, null, [], [true], false, '≈çœ∑®†¥∂ƒ©˙∆'],
    object: {1: null, '∑®†¥': false, array: []},
  },
};

function testWithJsonTestSuite() {
  const jsonDir = `${__dirname}/../json-test-suite/correct`;
  const keys = Object.keys(correct);
  for (const key of keys) {
    const filepath = `${jsonDir}/${key}_inline.json`;
    const content = fs.readFileSync(filepath, {encoding: 'utf8'});
    try {
      const actual = parse(content);
      deepStrictEqual(actual, correct[key]);
    } catch (e) {
      if (e instanceof UnexpectedChar) {
        fail("couldn't parse " + key);
      } else {
        throw e;
      }
    }
  }
}

testBasic();
testWithJsonTestSuite();
console.log('passed!');
