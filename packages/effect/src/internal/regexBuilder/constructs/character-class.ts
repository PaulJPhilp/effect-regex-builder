import type { EncodeResult } from '../encoder/types.js';
import type { RegexConstruct, RegexConstructType } from '../types.js';

export interface CharacterClass extends RegexConstruct {
  type: RegexConstructType
  escape?: string;
  chars: string[];
  ranges: CharacterRange[];
  isNegated: boolean;
  encode: () => EncodeResult;
}

/**
 * Character range from start to end (inclusive).
 */
export interface CharacterRange {
  start: string;
  end: string;
}

export const any: CharacterClass = {
  _tag: "RegexConstruct",
  type: 'any',
  escape: '.',
  chars: [],
  ranges: [],
  isNegated: false,
  encode: encodeCharacterClass,
};

export const digit: CharacterClass = {
  _tag: "RegexConstruct",
  type: 'digit',
  escape: '\\d',
  chars: [],
  ranges: [],
  isNegated: false,
  encode: encodeCharacterClass,
};

export const nonDigit: CharacterClass = {
  _tag: "RegexConstruct",
  type: 'nonDigit',
  escape: '\\D',
  chars: [],
  ranges: [],
  isNegated: false,
  encode: encodeCharacterClass,
};

export const word: CharacterClass = {
  _tag: "RegexConstruct",
  type: 'word',
  escape: '\\w',
  chars: [],
  ranges: [],
  isNegated: false,
  encode: encodeCharacterClass,
};

export const nonWord: CharacterClass = {
  _tag: "RegexConstruct",
  type: 'nonWord',
  escape: '\\W',
  chars: [],
  ranges: [],
  isNegated: false,
  encode: encodeCharacterClass,
};

export const whitespace: CharacterClass = {
  _tag: "RegexConstruct",
  type: 'whitespace',
  escape: '\\s',
  chars: [],
  ranges: [],
  isNegated: false,
  encode: encodeCharacterClass,
};

export const nonWhitespace: CharacterClass = {
  _tag: "RegexConstruct",
  type: 'nonWhitespace',
  escape: '\\S',
  chars: [],
  ranges: [],
  isNegated: false,
  encode: encodeCharacterClass,
};

/**
 * @deprecated Renamed to `nonDigit`.
 */
export const notDigit = nonDigit;

/**
 * @deprecated Renamed to `nonWord`.
 */
export const notWord = nonWord;

/**
 * @deprecated Renamed to `nonWhitespace`.
 */
export const notWhitespace = nonWhitespace;

export function charClass(...elements: CharacterClass[]): CharacterClass {
  if (elements.some((e) => e.isNegated)) {
    throw new Error('`charClass` should receive only non-negated character classes');
  }

  if (elements.length === 1) {
    return elements[0]!;
  }

  return {
    _tag: "RegexConstruct",
    type: 'nonWhitespace',
    chars: elements.map((c) => getAllChars(c)).flat(),
    ranges: elements.map((c) => c.ranges).flat(),
    isNegated: false,
    encode: encodeCharacterClass,
  };
}

export function charRange(start: string, end: string): CharacterClass {
  if (start.length !== 1) {
    throw new Error('`charRange` should receive only single character `start` string');
  }

  if (end.length !== 1) {
    throw new Error('`charRange` should receive only single character `end` string');
  }

  if (start > end) {
    throw new Error('`start` should be before or equal to `end`');
  }

  return {
    _tag: "RegexConstruct",
    type: 'charRange',
    chars: [],
    ranges: [{ start, end }],
    isNegated: false,
    encode: encodeCharacterClass,
  };
}

export function anyOf(characters: string): CharacterClass {
  const chars = characters.split('').map((c) => escapeForCharacterClass(c));

  if (chars.length === 0) {
    throw new Error('`anyOf` should received at least one character');
  }

  return {
    _tag: "RegexConstruct",
    type: 'anyOf',
    chars,
    ranges: [],
    isNegated: false,
    encode: encodeCharacterClass,
  };
}

export function negated(element: CharacterClass): CharacterClass {
  return {
    _tag: "RegexConstruct",
    type: 'negated',
    chars: element.chars,
    ranges: element.ranges,
    isNegated: !element.isNegated,
    encode: encodeCharacterClass,
  };
}

/**
 * @deprecated Renamed to `negated`.
 */
export const inverted = negated;

function encodeCharacterClass(this: CharacterClass): EncodeResult {
  if (this.escape === undefined && this.chars.length === 0 && this.ranges.length === 0) {
    throw new Error('Character class should contain at least one character or character range');
  }

  // Direct rendering for single-character class
  if (this.escape !== undefined && !this.chars.length && !this.ranges.length && !this.isNegated) {
    return {
      _tag: "EncodeResult",
      type: "charClass",
      precedence: 'atom',
      pattern: this.escape,
    };
  }

  const allChars = getAllChars(this);

  // If passed characters includes hyphen (`-`) it need to be moved to
  // first (or last) place in order to treat it as hyphen character and not a range.
  // See: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions/Character_classes#types
  const hyphen = allChars.includes('-') ? '-' : '';
  const caret = allChars.includes('^') ? '^' : '';
  const otherChars = allChars.filter((c) => c !== '-' && c !== '^').join('');
  const ranges = this.ranges.map(({ start, end }) => `${start}-${end}`).join('');
  const negation = this.isNegated ? '^' : '';

  let pattern = `[${negation}${ranges}${otherChars}${caret}${hyphen}]`;
  if (pattern === '[^-]') pattern = '[\\^-]';

  return {
    _tag: "EncodeResult",
    type: "charClass",
    precedence: 'atom',
    pattern,
  };
}

function escapeForCharacterClass(text: string): string {
  return text.replace(/[\]\\]/g, '\\$&'); // $& means the whole matched string
}

function getAllChars(characterClass: CharacterClass) {
  if (characterClass.escape === undefined) {
    return characterClass.chars;
  }

  return [characterClass.escape, ...characterClass.chars];
}
