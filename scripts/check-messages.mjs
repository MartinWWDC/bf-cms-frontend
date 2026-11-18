// Checks that every language file has exactly the keys of messages/en.json and uses the
// same placeholders and rich-text tags in each message. Run with `npm run i18n:check`.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const dir = join(import.meta.dirname, "..", "messages");
const SOURCE = "en.json";

function flatten(object, prefix = "") {
  return Object.entries(object).flatMap(([key, value]) =>
    value && typeof value === "object" ? flatten(value, `${prefix}${key}.`) : [[`${prefix}${key}`, String(value)]],
  );
}

/**
 * Argument names ({count}, {label}) and tag names (<range>) used by a message.
 * Text inside plural/select branches ("one {record}") is wording, not an argument, so a
 * brace that follows a branch selector is skipped.
 */
function tokens(message) {
  const args = [...message.matchAll(/(?<!\b(?:zero|one|two|few|many|other|=\d+)\s*)\{\s*([A-Za-z0-9_]+)\s*[,}]/g)].map(
    (match) => `{${match[1]}}`,
  );
  const tags = [...message.matchAll(/<([A-Za-z0-9_]+)>/g)].map((match) => `<${match[1]}>`);
  return [...new Set([...args, ...tags])].sort();
}

const load = (file) => new Map(flatten(JSON.parse(readFileSync(join(dir, file), "utf8"))));
const source = load(SOURCE);
const problems = [];

for (const file of readdirSync(dir).filter((name) => name.endsWith(".json") && name !== SOURCE)) {
  const target = load(file);
  for (const [key, message] of source) {
    if (!target.has(key)) {
      problems.push(`${file}: missing "${key}"`);
      continue;
    }
    const expected = tokens(message).join(" ");
    const actual = tokens(target.get(key)).join(" ");
    if (expected !== actual) {
      problems.push(`${file}: "${key}" uses [${actual}] but ${SOURCE} uses [${expected}]`);
    }
  }
  for (const key of target.keys()) {
    if (!source.has(key)) problems.push(`${file}: extra "${key}" (not in ${SOURCE})`);
  }
}

if (problems.length > 0) {
  console.error(`Translation check failed:\n${problems.map((problem) => `  - ${problem}`).join("\n")}`);
  process.exit(1);
}
console.log(`Translations OK: ${source.size} messages in every language.`);
