import { writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  InputData,
  jsonInputForTargetLanguage,
  quicktype,
} from "quicktype-core";
import type { FinalCompiledOutput } from "../types.js";

const ROOT_NAME = "DkeNaFamilyTree";
const TYPES_FILENAME = "FamilyTree.ts";

export async function writeFamilyTreeTypes(
  data: FinalCompiledOutput,
  outputDir: string,
): Promise<void> {
  const inputData = new InputData();
  const jsonInput = jsonInputForTargetLanguage("typescript");
  await jsonInput.addSource({
    name: ROOT_NAME,
    samples: [JSON.stringify(data)],
  });
  inputData.addInput(jsonInput);

  const result = await quicktype({
    lang: "typescript",
    inputData,
    outputFilename: TYPES_FILENAME,
  });

  const contents = result.lines.join("\n");
  const typesPath = join(outputDir, TYPES_FILENAME);
  writeFileSync(typesPath, contents, "utf-8");
  console.log(`Types: ${typesPath}`);

  const treeTs = `import type {
  By,
  Colors,
  DkeNaFamilyTree,
  Info,
  Metadata,
  Tree,
} from "./FamilyTree.ts";
import jsonTree from "./tree.json";
export type { By, Colors, DkeNaFamilyTree, Info, Metadata, Tree };
export const dkeNaFamilyTree = jsonTree as DkeNaFamilyTree;

`;

  writeFileSync(join(outputDir, "tree.ts"), treeTs, "utf-8");
}
