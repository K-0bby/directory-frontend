import { readFileSync } from "node:fs";

const routePath = "src/app/api/all_users/route.ts";
const source = readFileSync(routePath, "utf8");

const requiredPatterns = [
  { label: "an uncached upstream fetch", pattern: /cache:\s*["']no-store["']/ },
  { label: "a private no-store response", pattern: /private,\s*no-store/ },
  { label: "authorization-aware responses", pattern: /Vary:\s*["']Authorization["']/ },
  { label: "forwarding the request query string", pattern: /request\.nextUrl\.search/ },
];

const forbiddenPatterns = [
  { label: "revalidated fetch caching", pattern: /next:\s*\{\s*revalidate/ },
  { label: "public cacheability", pattern: /Cache-Control["']?:\s*["'][^"']*public/i },
  { label: "shared-cache max age", pattern: /s-maxage/i },
  { label: "stale shared responses", pattern: /stale-while-revalidate/i },
];

const failures = [];

if (!source.includes(".replace(/\\/+$/, '')")) {
  failures.push("Missing normalization for multiple trailing API URL slashes.");
}

for (const requirement of requiredPatterns) {
  if (!requirement.pattern.test(source)) {
    failures.push(`Missing ${requirement.label}.`);
  }
}

for (const forbidden of forbiddenPatterns) {
  if (forbidden.pattern.test(source)) {
    failures.push(`Found forbidden ${forbidden.label}.`);
  }
}

if (failures.length > 0) {
  console.error(
    `Private API cache verification failed for ${routePath}:\n- ${failures.join("\n- ")}`,
  );
  process.exit(1);
}

console.log(`Private API cache verification passed for ${routePath}.`);
