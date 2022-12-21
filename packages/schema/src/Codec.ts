/**
 * @since 1.0.0
 */

import type { Left, Right } from "@fp-ts/data/Either"
import * as E from "@fp-ts/data/Either"
import { pipe } from "@fp-ts/data/Function"
import * as Json from "@fp-ts/data/Json"
import type { Option } from "@fp-ts/data/Option"
import type { NonEmptyReadonlyArray } from "@fp-ts/data/ReadonlyArray"
import type { Both, These } from "@fp-ts/data/These"
import type { Arbitrary } from "@fp-ts/schema/Arbitrary"
import { arbitraryFor } from "@fp-ts/schema/Arbitrary"
import type { AST, Literal } from "@fp-ts/schema/AST"
import type { DecodeError } from "@fp-ts/schema/DecodeError"
import type { Decoder } from "@fp-ts/schema/Decoder"
import { decoderFor } from "@fp-ts/schema/Decoder"
import type { Encoder } from "@fp-ts/schema/Encoder"
import { encoderFor } from "@fp-ts/schema/Encoder"
import type { Guard } from "@fp-ts/schema/Guard"
import { guardFor } from "@fp-ts/schema/Guard"
import * as I from "@fp-ts/schema/internal/common"
import type { Pretty } from "@fp-ts/schema/Pretty"
import { prettyFor } from "@fp-ts/schema/Pretty"
import type { Schema } from "@fp-ts/schema/Schema"
import * as S from "@fp-ts/schema/Schema"

/**
 * @since 1.0.0
 */
export class Codec<A>
  implements Schema<A>, Decoder<unknown, A>, Encoder<unknown, A>, Guard<A>, Arbitrary<A>, Pretty<A>
{
  readonly A!: (_: A) => A
  readonly I!: (_: unknown) => void
  readonly ast: AST
  readonly decode: Decoder<unknown, A>["decode"]
  readonly encode: Encoder<unknown, A>["encode"]
  readonly is: Guard<A>["is"]
  readonly arbitrary: Arbitrary<A>["arbitrary"]
  readonly pretty: Pretty<A>["pretty"]

  constructor(
    schema: Schema<A>
  ) {
    this.ast = schema.ast
    this.decode = decoderFor(schema).decode
    this.encode = encoderFor(schema).encode
    this.is = guardFor(schema).is
    this.arbitrary = arbitraryFor(schema).arbitrary
    this.pretty = prettyFor(schema).pretty
    this.parseOrThrow.bind(this)
    this.stringify.bind(this)
  }
  parseOrThrow(
    text: string,
    format?: (errors: NonEmptyReadonlyArray<DecodeError>) => string
  ): A {
    const json = Json.parse(text)
    if (E.isLeft(json)) {
      throw new Error(`Cannot parse JSON from: ${text}`)
    }
    const result = this.decode(json.right)
    if (!I.isFailure(result)) {
      return result.right
    }
    const message = `Cannot decode JSON` +
      (format ? `, errors: ${format(result.left)}` : ``)
    throw new Error(message)
  }
  stringify(value: A): string {
    const json = Json.stringify(this.encode(value))
    if (E.isLeft(json)) {
      throw new Error(`Cannot encode JSON, error: ${String(json.left)}`)
    }
    return json.right
  }
  of(value: A): A {
    return value
  }
}

/**
 * @since 1.0.0
 */
export type Infer<S extends Schema<any>> = Parameters<S["A"]>[0]

// ---------------------------------------------
// constructors
// ---------------------------------------------

/**
 * @since 1.0.0
 */
export const success: <A>(a: A) => These<never, A> = I.success

/**
 * @since 1.0.0
 */
export const failure: (
  e: DecodeError
) => These<NonEmptyReadonlyArray<DecodeError>, never> = I.failure

/**
 * @since 1.0.0
 */
export const failures: (
  es: NonEmptyReadonlyArray<DecodeError>
) => These<NonEmptyReadonlyArray<DecodeError>, never> = I.failures

/**
 * @since 1.0.0
 */
export const warning: <A>(
  e: DecodeError,
  a: A
) => These<NonEmptyReadonlyArray<DecodeError>, A> = I.warning

/**
 * @since 1.0.0
 */
export const warnings: <A>(
  es: NonEmptyReadonlyArray<DecodeError>,
  a: A
) => These<NonEmptyReadonlyArray<DecodeError>, A> = I.warnings

/**
 * @since 1.0.0
 */
export const isSuccess: <E, A>(self: These<E, A>) => self is Right<A> = I.isSuccess

/**
 * @since 1.0.0
 */
export const isFailure: <E, A>(self: These<E, A>) => self is Left<E> = I.isFailure

/**
 * @since 1.0.0
 */
export const isWarning: <E, A>(self: These<E, A>) => self is Both<E, A> = I.isWarning

/**
 * @since 1.0.0
 */
export const codecFor = <A>(schema: Schema<A>): Codec<A> => new Codec(schema)

/**
 * @since 1.0.0
 */
export const literal = <A extends ReadonlyArray<Literal>>(
  ...a: A
): Codec<A[number]> => codecFor(S.literal(...a))

/**
 * @since 1.0.0
 */
export const uniqueSymbol = <S extends symbol>(symbol: S): Codec<S> =>
  codecFor(S.uniqueSymbol(symbol))

/**
 * @since 1.0.0
 */
export const enums = <A extends { [x: string]: string | number }>(
  nativeEnum: A
): Codec<A[keyof A]> => codecFor(S.enums(nativeEnum))

// ---------------------------------------------
// filters
// ---------------------------------------------

/**
 * @since 1.0.0
 */
export const minLength = (minLength: number) =>
  <A extends { length: number }>(self: Schema<A>): Codec<A> =>
    codecFor(S.minLength(minLength)(self))

/**
 * @since 1.0.0
 */
export const maxLength = (maxLength: number) =>
  <A extends { length: number }>(self: Schema<A>): Codec<A> =>
    codecFor(S.maxLength(maxLength)(self))

/**
 * @since 1.0.0
 */
export const startsWith = (startsWith: string) =>
  <A extends string>(self: Schema<A>): Codec<A> => codecFor(S.startsWith(startsWith)(self))

/**
 * @since 1.0.0
 */
export const endsWith = (endsWith: string) =>
  <A extends string>(self: Schema<A>): Codec<A> => codecFor(S.endsWith(endsWith)(self))

/**
 * @since 1.0.0
 */
export const regex = (regex: RegExp) =>
  <A extends string>(self: Schema<A>): Codec<A> =>
    codecFor(
      S.regex(regex)(self)
    )

/**
 * @since 1.0.0
 */
export const lessThan = (min: number) =>
  <A extends number>(self: Schema<A>): Codec<A> => codecFor(S.lessThan(min)(self))

/**
 * @since 1.0.0
 */
export const lessThanOrEqualTo = (min: number) =>
  <A extends number>(self: Schema<A>): Codec<A> => codecFor(S.lessThanOrEqualTo(min)(self))

/**
 * @since 1.0.0
 */
export const greaterThan = (max: number) =>
  <A extends number>(self: Schema<A>): Codec<A> => codecFor(S.greaterThan(max)(self))

/**
 * @since 1.0.0
 */
export const greaterThanOrEqualTo = (max: number) =>
  <A extends number>(self: Schema<A>): Codec<A> => codecFor(S.greaterThanOrEqualTo(max)(self))

/**
 * @since 1.0.0
 */
export const int = <A extends number>(self: Schema<A>): Codec<A> => codecFor(S.int(self))

// ---------------------------------------------
// combinators
// ---------------------------------------------

/**
 * @since 1.0.0
 */
export const union = <Members extends ReadonlyArray<Schema<any>>>(
  ...members: Members
): Codec<Infer<Members[number]>> => codecFor(S.union(...members))

/**
 * @since 1.0.0
 */
export const keyof = <A>(schema: Schema<A>): Codec<keyof A> => codecFor(S.keyof(schema))

/**
 * @since 1.0.0
 */
export const tuple = <Elements extends ReadonlyArray<Schema<any>>>(
  ...elements: Elements
): Codec<{ readonly [K in keyof Elements]: Infer<Elements[K]> }> =>
  codecFor(S.tuple<Elements>(...elements))

/**
 * @since 1.0.0
 */
export const rest = <R>(rest: Schema<R>) =>
  <A extends ReadonlyArray<any>>(self: Schema<A>): Codec<readonly [...A, ...Array<R>]> =>
    codecFor(S.rest(rest)(self))

/**
 * @since 1.0.0
 */
export const element = <E>(element: Schema<E>) =>
  <A extends ReadonlyArray<any>>(self: Schema<A>): Codec<readonly [...A, E]> =>
    codecFor(S.element(element)(self))

/**
 * @since 1.0.0
 */
export const optionalElement = <E>(element: Schema<E>) =>
  <A extends ReadonlyArray<any>>(self: Schema<A>): Codec<readonly [...A, E?]> =>
    codecFor(S.optionalElement(element)(self))

/**
 * @since 1.0.0
 */
export const array = <A>(item: Schema<A>): Codec<ReadonlyArray<A>> => codecFor(S.array(item))

/**
 * @since 1.0.0
 */
export const nonEmptyArray = <A>(
  item: Schema<A>
): Codec<readonly [A, ...Array<A>]> => codecFor(S.nonEmptyArray(item))

/**
 * @since 1.0.0
 */
export const optional: <A>(schema: Schema<A>) => S.OptionalSchema<A, true> = I.optional

/**
 * @since 1.0.0
 */
export const struct = <Fields extends Record<PropertyKey, Schema<any>>>(
  fields: Fields
): Codec<
  S.Spread<
    & { readonly [K in Exclude<keyof Fields, S.OptionalKeys<Fields>>]: Infer<Fields[K]> }
    & { readonly [K in S.OptionalKeys<Fields>]?: Infer<Fields[K]> }
  >
> => codecFor(S.struct(fields))

/**
 * @since 1.0.0
 */
export const pick = <A, Keys extends ReadonlyArray<keyof A>>(...keys: Keys) =>
  (self: Schema<A>): Codec<{ readonly [P in Keys[number]]: A[P] }> =>
    codecFor(pipe(self, S.pick(...keys)))

/**
 * @since 1.0.0
 */
export const omit = <A, Keys extends ReadonlyArray<keyof A>>(...keys: Keys) =>
  (self: Schema<A>): Codec<{ readonly [P in Exclude<keyof A, Keys[number]>]: A[P] }> =>
    codecFor(pipe(self, S.omit(...keys)))

/**
 * @since 1.0.0
 */
export const partial = <A>(self: Schema<A>): Codec<Partial<A>> => codecFor(S.partial(self))

/**
 * @since 1.0.0
 */
export const stringIndexSignature = <A>(value: Schema<A>): Codec<{ readonly [x: string]: A }> =>
  codecFor(S.symbolIndexSignature(value))

/**
 * @since 1.0.0
 */
export const symbolIndexSignature = <A>(value: Schema<A>): Codec<{ readonly [x: symbol]: A }> =>
  codecFor(S.symbolIndexSignature(value))

/**
 * @since 1.0.0
 */
export const extend = <B>(
  that: Schema<B>
) => <A>(self: Schema<A>): Codec<A & B> => codecFor(S.extend(that)(self))

/**
 * @since 1.0.0
 */
export const lazy = <A>(f: () => Schema<A>): Codec<A> => codecFor(S.lazy(f))

/**
 * @since 1.0.0
 */
export const filter = <A, B extends A>(
  decode: Decoder<A, B>["decode"],
  annotations: ReadonlyArray<unknown>
) => (self: Schema<A>): Codec<B> => codecFor(S.filter(decode, annotations)(self))

/**
 * @since 1.0.0
 */
export const parse = <A, B>(
  decode: Decoder<A, B>["decode"],
  encode: Encoder<A, B>["encode"],
  is: (u: unknown) => u is B,
  arbitrary: Arbitrary<B>["arbitrary"],
  pretty: Pretty<B>["pretty"],
  annotations: ReadonlyArray<unknown>
) =>
  (self: Schema<A>): Codec<B> =>
    codecFor(
      S.parse(decode, encode, is, arbitrary, pretty, annotations)(self)
    )

/**
 * @since 1.0.0
 */
export const annotation = (
  annotation: unknown
) => <A>(schema: Schema<A>): Codec<A> => codecFor(S.annotation(annotation)(schema))

/**
 * @since 1.0.0
 */
export const annotations = (
  annotations: ReadonlyArray<unknown>
) => <A>(schema: Schema<A>): Codec<A> => codecFor(S.annotations(annotations)(schema))

// ---------------------------------------------
// data
// ---------------------------------------------

const _undefined: Codec<undefined> = codecFor(S.undefined)

const _void: Codec<void> = codecFor(S.void)

export {
  /**
   * @since 1.0.0
   */
  _undefined as undefined,
  /**
   * @since 1.0.0
   */
  _void as void
}

/**
 * @since 1.0.0
 */
export const string: Codec<string> = codecFor(S.string)

/**
 * @since 1.0.0
 */
export const number: Codec<number> = codecFor(S.number)

/**
 * @since 1.0.0
 */
export const boolean: Codec<boolean> = codecFor(S.boolean)

/**
 * @since 1.0.0
 */
export const bigint: Codec<bigint> = codecFor(S.bigint)

/**
 * @since 1.0.0
 */
export const symbol: Codec<symbol> = codecFor(S.symbol)

/**
 * @since 1.0.0
 */
export const unknown: Codec<unknown> = codecFor(S.unknown)

/**
 * @since 1.0.0
 */
export const any: Codec<any> = codecFor(S.any)

/**
 * @since 1.0.0
 */
export const never: Codec<never> = codecFor(S.never)

/**
 * @since 1.0.0
 */
export const json: Codec<Json.Json> = codecFor(S.json)

/**
 * @since 1.0.0
 */
export const option = <A>(value: Schema<A>): Codec<Option<A>> => codecFor(S.option(value))

// ---------------------------------------------
// builders
// ---------------------------------------------

/**
 * @since 1.0.0
 */
export class StringBuilder<A extends string> extends Codec<A> {
  constructor(schema: Schema<A>) {
    super(schema)
  }

  max(n: number) {
    return new StringBuilder(S.maxLength(n)(this))
  }
  min(n: number) {
    return new StringBuilder(S.minLength(n)(this))
  }
  length(n: number) {
    return this.min(n).max(n)
  }
  nonEmpty() {
    return this.min(1)
  }
  startsWith(s: string) {
    return new StringBuilder(S.startsWith(s)(this))
  }
  endsWith(s: string) {
    return new StringBuilder(S.endsWith(s)(this))
  }
  regex(r: RegExp) {
    return new StringBuilder(S.regex(r)(this))
  }
  filter<B extends A>(
    decode: Decoder<A, B>["decode"],
    annotations: ReadonlyArray<unknown> = []
  ) {
    return new StringBuilder(S.filter(decode, annotations)(this))
  }
}
