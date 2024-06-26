import { encodeSequence } from '../encoder/encoder.js';
import type { EncodeResult } from '../encoder/types.js';
import type { RegexConstruct, RegexElement, RegexSequence } from '../types.js';
import { ensureArray } from '../utils/elements.js';

export interface ChoiceOf extends RegexConstruct {
  type: 'choiceOf';
  alternatives: RegexElement[][];
}

export function choiceOf(...alternatives: RegexSequence[]): ChoiceOf {
  if (alternatives.length === 0) {
    throw new Error('`choiceOf` should receive at least one alternative');
  }

  return {
    type: 'choiceOf',
    alternatives: alternatives.map((c) => ensureArray(c)),
    encode: encodeChoiceOf,
  };
}

function encodeChoiceOf(this: ChoiceOf): EncodeResult {
  const encodedAlternatives = this.alternatives.map((c) => encodeSequence(c));
  if (encodedAlternatives.length === 1) {
    return encodedAlternatives[0]!;
  }

  return {
    precedence: 'disjunction',
    pattern: encodedAlternatives.map((n) => n.pattern).join('|'),
  };
}
