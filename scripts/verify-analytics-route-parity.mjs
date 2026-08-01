import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const BASELINE = {
  all: {
    count: 201,
    sha256: "acdf8c6b3ac8c1749e683ff27479c71c8454f0fad8e7f19cf772120c3ae27f83",
  },
  pages: {
    count: 61,
    sha256: "2745909e7eeb7d7e76d8b869da70fc2f016fe31d4f536c97ed505661f1b289e2",
  },
  api: {
    count: 140,
    sha256: "3b12573c29acbc33210c4e8ca9a46470624a59a8023c5b7bca5d06542eb2779f",
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
