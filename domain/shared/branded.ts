/**
 * Nominal ("branded") types. Two `string` ids with different brands are not
 * assignable to each other, so an `AssetId` can never be passed where a
 * `RepresentationId` is expected — caught at compile time, no runtime cost.
 *
 * Constructors that validate the underlying value live in the TASK that owns
 * the concept (registry ids: TASK-05; token id: TASK-09). This module only
 * defines the shape.
 */
export type Brand<T, B extends string> = T & { readonly __brand: B };

/** Unix time in milliseconds. */
export type UnixMillis = Brand<number, "UnixMillis">;

/** Unix time in seconds (on-chain timestamps, oracle `updatedAt`). */
export type UnixSeconds = Brand<number, "UnixSeconds">;

/** A 0x-prefixed, checksummed EVM address. Validation: TASK-05. */
export type Address = Brand<string, "Address">;

/** A 0x-prefixed 32-byte hex string. */
export type Hex32 = Brand<string, "Hex32">;
