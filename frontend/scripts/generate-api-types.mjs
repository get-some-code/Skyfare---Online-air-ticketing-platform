import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import openapiTS, { astToString } from "openapi-typescript";

const schemaUrl =
  process.env.SKYFARE_OPENAPI_URL ?? "http://127.0.0.1:8000/openapi.json";
const outputPath = resolve("src/lib/api/openapi.d.ts");

const response = await fetch(schemaUrl);
if (!response.ok) {
  throw new Error(
    `Could not fetch OpenAPI schema from ${schemaUrl}: ${response.status} ${response.statusText}`,
  );
}

const schema = await response.json();
const ast = await openapiTS(schema);
await writeFile(outputPath, astToString(ast), "utf8");
console.info(`Generated API types at ${outputPath}`);
