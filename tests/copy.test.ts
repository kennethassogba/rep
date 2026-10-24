import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
  );
test("authored interface copy has no hidden spacing, smart quotes, long dashes or trailing whitespace", () => {
  for (const file of [...walk("src"), "index.html"].filter((p) =>
    /\.(ts|css|html)$/.test(p),
  )) {
    const text = readFileSync(file, "utf8");
    assert.doesNotMatch(
      text,
      /[\p{Cf}\u00a0\u202f\u2007\u2014\u2013\u2018-\u201f\u00ab\u00bb\u2026]/u,
      file,
    );
    assert.doesNotMatch(text, /[\t ]+$/m, file);
    assert.doesNotMatch(
      text,
      /Presidential parody|Caricatures generated for this game\.|id="next-action"|REP<span>/,
      file,
    );
  }
});
