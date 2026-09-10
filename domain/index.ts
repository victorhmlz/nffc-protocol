/**
 * Public surface of the framework-agnostic, provider-agnostic domain.
 *
 * TASK-02 establishes the module and its boundaries; the types below are
 * fleshed out (with validators, math, and formulas) by the TASKS that own each
 * concept — see the per-file headers.
 */
export * from "@domain/shared/branded";
export * from "@domain/registry/types";
export * from "@domain/nffc/composition";
export * from "@domain/nffc/segment";
export * from "@domain/metadata/metadata";
export * from "@domain/art/art";
export * from "@domain/pricing/types";
export * from "@domain/valuation/types";
export * from "@domain/rarity/types";
export * from "@domain/ports";
