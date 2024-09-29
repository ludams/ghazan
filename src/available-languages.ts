import devboost from "./languages/devboost.json?url";
import english_1k from "./languages/english_1k.json?url";
import english_10k from "./languages/english_10k.json?url";

export const listOfAvailableLanguages: Map<string, string> = new Map([
  ["devboost", devboost],
  ["english_1k", english_1k],
  ["english_10k", english_10k],
]);