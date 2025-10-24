/**
 * Minimal type augmentation for `next/headers` to satisfy our usage in the App Router.
 * This aligns with the async variants (`headers()`/`cookies()` returning Promises).
 *
 * Only the members we actually use are declared here.
 */

declare module "next/headers" {
  export interface ReadonlyHeaders {
    get(name: string): string | null;
    has?(name: string): boolean;
    // Add more methods as needed
  }

  export interface MinimalCookie {
    name: string;
    value: string;
  }

  export interface ReadonlyRequestCookies {
    get(name: string): MinimalCookie | undefined;
    getAll(name?: string): MinimalCookie[];
    // Add more methods as needed
  }

  export function headers(): Promise<ReadonlyHeaders>;
  export function cookies(): Promise<ReadonlyRequestCookies>;
}
