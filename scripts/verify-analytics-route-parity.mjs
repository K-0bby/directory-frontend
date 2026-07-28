import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const BASELINE = {
  all: {
    count: 196,
    sha256: "56bb1cc0d70f7b96edc2da3d5a420c9d83350318ef60a61bd0fd1c55e2663782",
  },
  pages: {
    count: 57,
    sha256: "031a14117c2d528442b8cc27d02ea08e10e01306545d466f11fcd5576ee06716",
  },
  api: {
    count: 139,
    sha256: "b9f5e8cbec051b36622537d84aa0ebf3053611890717c7e7e2bd925209434383",
  },
};

const manifest = JSON.parse(
  readFileSync(".next/server/app-paths-manifest.json", "utf8"),
);

const routes = [
  ...new Set(
    Object.keys(manifest).map((route) =>
      route.replace(/\/\([^/]+\)/g, ""),
    ),
  ),
].sort();

const inventories = {
  all: routes,
  pages: routes.filter((route) => !route.startsWith("/api/")),
  api: routes.filter((route) => route.startsWith("/api/")),
};

const failures = [];

for (const [name, paths] of Object.entries(inventories)) {
  const sha256 = createHash("sha256")
    .update(`${paths.join("\n")}\n`)
    .digest("hex");
  const actual = { count: paths.length, sha256 };
  const expected = BASELINE[name];

  if (
    actual.count !== expected.count ||
    actual.sha256 !== expected.sha256
  ) {
    failures.push({ inventory: name, expected, actual });
  }
}

if (failures.length > 0) {
  console.error(
    "Analytics hotfix route parity failed:",
    JSON.stringify(failures, null, 2),
  );
  process.exit(1);
}

console.log(
  `Route parity passed: ${inventories.pages.length} page paths and ${inventories.api.length} API/BFF paths.`,
);
