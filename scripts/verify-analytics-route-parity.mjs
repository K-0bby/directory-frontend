import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const BASELINE = {
  all: {
    count: 198,
    sha256: "f69d84255f49c73423c29176b152bdd368db499a9083cefeb2301fa8a261a0c3",
  },
  pages: {
    count: 58,
    sha256: "23a4800052e70cc16f5b3c55eb7a59f53b61a6e68b7c1370dfcb5dadfc2b65fe",
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
