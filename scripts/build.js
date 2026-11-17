// Joins lib/ into one ES module, dist/simplegl.js, for copying into projects
// that can't install packages. No dependencies: it relies on lib/ following
// a few conventions, and fails loudly if they're broken:
//   - relative imports only, one per line: import { a, b } from "./file.js";
//   - exports only as a single `export { ... };` per file
//   - top-level declarations start at column 0 with unique names across files
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const read = (file) => readFileSync(new URL(`../lib/${file}`, import.meta.url), "utf8");
const { version, homepage, license } = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

const importRe = /^import\s*\{[^}]*\}\s*from\s*["']\.\/([\w.]+)["'];?\s*$/gm;
const exportRe = /^export\s*\{([^}]*)\};?\s*$/gm;

// Visit files depth-first from index.js so each file comes after its imports.
const order = [];
const visit = (file) => {
  if (order.includes(file)) return;
  for (const [, dep] of read(file).matchAll(importRe)) visit(dep);
  order.push(file);
};
visit("index.js");

const declared = new Map();
const bodies = order
  .filter((file) => file !== "index.js")
  .map((file) => {
    const body = read(file).replace(importRe, "").replace(exportRe, "").trim();
    if (/^\s*(import|export)\b/m.test(body)) throw new Error(`build: ${file} has an import/export the build can't handle`);
    for (const [, name] of body.matchAll(/^(?:const|let|var|function|class)\s+(\w+)/gm)) {
      if (declared.has(name)) throw new Error(`build: "${name}" is declared in both ${declared.get(name)} and ${file}`);
      declared.set(name, file);
    }
    return `// ${file}\n${body}`;
  });

const exported = [...read("index.js").matchAll(exportRe)].flatMap(([, names]) => names.split(",").map((n) => n.trim()).filter(Boolean));

const out = `/*! wtc-simplegl v${version} | ${license} | ${homepage.replace(/#.*/, "")} */
// Generated from lib/ by scripts/build.js. Edit the files in lib/ instead.

${bodies.join("\n\n")}

export {
${exported.map((n) => `  ${n},`).join("\n")}
};
`;

mkdirSync(new URL("../dist/", import.meta.url), { recursive: true });
writeFileSync(new URL("../dist/simplegl.js", import.meta.url), out);
console.log(`dist/simplegl.js: ${order.length - 1} files, ${exported.length} exports, ${(out.length / 1024).toFixed(1)} KB`);
