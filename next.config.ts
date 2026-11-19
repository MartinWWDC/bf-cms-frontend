import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { NextConfig } from "next";

/**
 * Defaults for environment variables, read from `.env.example`: a variable that is missing
 * (or empty) in the environment takes the value written there. So a deployment without
 * its own settings talks to the dev API instead of to nothing. Only public
 * (`NEXT_PUBLIC_`) variables are taken, since the example file is committed.
 */
function exampleDefaults(): Record<string, string> {
  const defaults: Record<string, string> = {};
  let example = "";
  try {
    example = readFileSync(join(process.cwd(), ".env.example"), "utf8");
  } catch {
    return defaults;
  }
  for (const line of example.split("\n")) {
    const match = /^\s*(NEXT_PUBLIC_[A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (!match) continue;
    const value = match[2].replace(/^["']|["']$/g, "");
    if (value && !process.env[match[1]]) defaults[match[1]] = value;
  }
  return defaults;
}

const nextConfig: NextConfig = {
  env: exampleDefaults(),
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
