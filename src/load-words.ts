import { Config } from "./config.ts";

import { words as fallbackWords } from "./languages/english_1k.json";
import { listOfAvailableLanguages } from "./available-languages.ts";

export async function loadWords(config: Config): Promise<string[]> {
  let language: { language: string; languageUrl: string };
  const configuredLanguage = config.language;
  if (!listOfAvailableLanguages.has(configuredLanguage)) {
    console.error(
      `Configured language "${configuredLanguage}" is not supported. Falling back to default "${config.defaultLanguage}"`,
    );
    language = {
      language: config.defaultLanguage,
      languageUrl: listOfAvailableLanguages.get(config.defaultLanguage)!,
    };
  } else {
    language = {
      language: configuredLanguage,
      languageUrl: listOfAvailableLanguages.get(configuredLanguage)!,
    };
  }

  try {
    return await fetchWords(language.languageUrl);
  } catch (error) {
    console.error(
      `Fetching of language "${language}" failed. Falling back to default built-in language "english_1k".`,
      error,
    );
    return fallbackWords;
  }
}

async function fetchWords(languageUrl: string): Promise<string[]> {
  return await fetch(languageUrl)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok " + response.statusText);
      }
      return response.json();
    })
    .then((data: { words?: string[] }) => {
      if (data.words === undefined) {
        throw new Error(
          `Loaded language json file does not contain property "words"`,
        );
      }
      return data.words;
    });
}
