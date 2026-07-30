/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as categories from "../categories.js";
import type * as companies from "../companies.js";
import type * as directory from "../directory.js";
import type * as email from "../email.js";
import type * as inquiries from "../inquiries.js";
import type * as lib_aliases from "../lib/aliases.js";
import type * as lib_cards from "../lib/cards.js";
import type * as lib_constants from "../lib/constants.js";
import type * as lib_entitlements from "../lib/entitlements.js";
import type * as lib_env from "../lib/env.js";
import type * as lib_fold from "../lib/fold.js";
import type * as lib_searchText from "../lib/searchText.js";
import type * as lib_validators from "../lib/validators.js";
import type * as migration from "../migration.js";
import type * as seed from "../seed.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  categories: typeof categories;
  companies: typeof companies;
  directory: typeof directory;
  email: typeof email;
  inquiries: typeof inquiries;
  "lib/aliases": typeof lib_aliases;
  "lib/cards": typeof lib_cards;
  "lib/constants": typeof lib_constants;
  "lib/entitlements": typeof lib_entitlements;
  "lib/env": typeof lib_env;
  "lib/fold": typeof lib_fold;
  "lib/searchText": typeof lib_searchText;
  "lib/validators": typeof lib_validators;
  migration: typeof migration;
  seed: typeof seed;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
