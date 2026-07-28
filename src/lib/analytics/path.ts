const PRIVATE_IDENTIFIER_PATTERNS: ReadonlyArray<
  readonly [RegExp, string]
> = [
  [/^\/claim\/[^/]+/, "/claim/:id"],
  [/^\/dashboard\/users\/[^/]+/, "/dashboard/users/:id"],
  [/^\/dashboard\/listings\/[^/]+/, "/dashboard/listings/:slug"],
  [/^\/dashboard\/reviews\/[^/]+/, "/dashboard/reviews/:id"],
  [/^\/dashboard\/my-events\/[^/]+/, "/dashboard/my-events/:slug"],
  [/^\/dashboard\/my-listing\/[^/]+/, "/dashboard/my-listing/:slug"],
  [
    /^\/dashboard\/agent\/listings\/[^/]+/,
    "/dashboard/agent/listings/:slug",
  ],
];

/**
 * Remove private dynamic identifiers from analytics page paths.
 */
export function sanitizeAnalyticsPath(pathname: string): string {
  const pathOnly = pathname.split(/[?#]/, 1)[0] || "/";

  for (const [pattern, replacement] of PRIVATE_IDENTIFIER_PATTERNS) {
    if (pattern.test(pathOnly)) return pathOnly.replace(pattern, replacement);
  }

  return pathOnly;
}
