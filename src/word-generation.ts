import seedrandom from "seedrandom";
import { GameState, TileCoordinate } from "./gameState.ts";
import { words } from "./languages/english_10k.json";
import { Config } from "./config.ts";

const englishWords: string[] = words;
const englishWordsMap: Map<number, string[]> = new Map();
englishWords.forEach((word) => {
  if (!englishWordsMap.has(word.length)) {
    englishWordsMap.set(word.length, []);
  }
  englishWordsMap.get(word.length)!.push(word.toLowerCase());
});

export class WordGeneration {
  private readonly gameState: GameState;
  private readonly config: Config;
  private readonly random: () => number;

  constructor(gameState: GameState, config: Config) {
    this.gameState = gameState;
    this.config = config;
    this.random = seedrandom(gameState.game.config.baseSeed + "Words");
  }

  public renderNextWordsIfNecessary() {
    const surroundingTiles = this.gameState.getSurroundingPathTiles(
      this.gameState.currentCoordinate,
    );

    // only one direction "I'm in a corridor, have one option, so I'm not at a crossing" so the algorithm must already have generated a letter for the next tile
    if (surroundingTiles.length <= 2) {
      return;
    }

    this.renderNextWords(
      this.gameState.currentCoordinate,
      this.gameState.history[this.gameState.history.length - 1] ?? null,
      this.gameState.game.config.crossingsToPreFillWithWords,
    );
  }

  private getRandomWordsOfTotalLengthWithConstraints(
    totalLength: number,
    blockedBeginnings: string[],
    blockedEndings: string[],
  ): string | undefined {
    if (totalLength === 1) {
      return this.generateRandomString(blockedBeginnings, 1);
    }
    if (englishWordsMap.has(totalLength)) {
      const tooSmallForSplitting =
        totalLength <= this.config.maxWordLengthToChooseInExactLengthMatchCase;
      const chanceDecidedToNotSplitIntoMultipleWords =
        Math.floor(this.random()) <=
        Math.floor(
          (this.config.maxWordLengthToChooseInExactLengthMatchCase + 1) / 2,
        );
      if (tooSmallForSplitting || chanceDecidedToNotSplitIntoMultipleWords) {
        const possibleExactLengthWord = englishWordsMap
          .get(totalLength)!
          .filter(
            (word) =>
              !blockedBeginnings.includes(word.charAt(0)) &&
              !blockedEndings.includes(word.charAt(word.length - 1)),
          );
        if (possibleExactLengthWord.length > 0) {
          const chosenWordIndex = Math.floor(
            this.random() * possibleExactLengthWord.length,
          );
          return possibleExactLengthWord[chosenWordIndex];
        }
      }
    }

    const possibleWordsByLengthForFirstWord = Array.from(
      englishWordsMap.entries(),
    )
      .filter(([length]) => length < totalLength - 1)
      .map(
        ([letter, words]) =>
          [
            letter,
            words.filter((word) => !blockedBeginnings.includes(word.charAt(0))),
          ] as const,
      )
      .filter(([_, words]) => words.length > 0);

    const possibleLengthsForFirstWord = possibleWordsByLengthForFirstWord.map(
      ([length]) => length,
    );

    while (possibleLengthsForFirstWord.length > 0) {
      const chosenWordLengthIndex = Math.floor(
        this.random() * possibleLengthsForFirstWord.length,
      );
      const [_, possibleWords] =
        possibleWordsByLengthForFirstWord[chosenWordLengthIndex];

      const chosenWordIndex = Math.floor(this.random() * possibleWords.length);
      const chosenWord = possibleWords[chosenWordIndex];

      const remainingWord = this.getRandomWordsOfTotalLengthWithConstraints(
        totalLength - chosenWord.length - 1,
        [],
        blockedEndings,
      );

      if (remainingWord !== undefined) {
        return chosenWord + " " + remainingWord;
      }
    }

    return undefined;
  }

  generateRandomString(blockedCharacters: string[], length: number) {
    const charset = "abcdefghijklmnopqrstuvwxyz";
    const reducedCharsetForFirstLetter = charset
      .split("")
      .filter((char) => !blockedCharacters.includes(char));
    let result = "";

    const firstLetterCharIndex = Math.floor(
      this.random() * reducedCharsetForFirstLetter.length,
    );
    result += reducedCharsetForFirstLetter[firstLetterCharIndex];

    for (let i = 1; i < length; i++) {
      const index = Math.floor(this.random() * charset.length);
      result += charset[index];
    }

    return result;
  }

  renderNextWords(
    crossingTile: TileCoordinate,
    comingFromTile: TileCoordinate | null,
    crossingsToPass: number,
  ) {
    let outgoingTilePathsToGenerateWordsFor = this.getOutgoingPathsToFollowNext(
      crossingTile,
      comingFromTile,
    );

    for (const pathTiles of outgoingTilePathsToGenerateWordsFor) {
      const lastTile = pathTiles[pathTiles.length - 1];

      if (this.isPathTileWritable(pathTiles)) {
        let chosenWord = this.chooseLettersForPathTiles(
          crossingTile,
          pathTiles,
          lastTile,
        );

        this.writeWordToPathTiles(chosenWord, pathTiles);
      }

      if (!this.isPathTileDeadEnd(lastTile) && crossingsToPass > 1) {
        this.renderNextWords(
          pathTiles[pathTiles.length - 1],
          pathTiles[pathTiles.length - 2] ?? null,
          crossingsToPass - 1,
        );
      }
    }
  }

  private isPathTileWritable(pathTiles: TileCoordinate[]): boolean {
    const firstTile = this.gameState.findTile(...pathTiles[0]);
    if (firstTile === null) {
      console.warn(`Tile at ${pathTiles[0]} not found`);
      return false;
    }
    return firstTile.letter === undefined;
  }

  private writeWordToPathTiles(
    chosenWord: string,
    pathTiles: TileCoordinate[],
  ) {
    pathTiles.forEach(([x, y], index) => {
      const tile = this.gameState.findTile(x, y);
      tile?.setLetter(chosenWord.charAt(index));
    });
  }

  private chooseLettersForPathTiles(
    crossingTile: TileCoordinate,
    pathTiles: TileCoordinate[],
    lastTile: TileCoordinate,
  ): string {
    const allSurroundingTiles =
      this.gameState.getSurroundingPathTiles(crossingTile);

    const disallowedBeginningsLetters = allSurroundingTiles
      .map((tile) => tile.letter)
      .filter((letter): letter is string => letter !== undefined);
    const disallowedEndingLetters = this.gameState
      .getSurroundingPathTiles(pathTiles[pathTiles.length - 1])
      .map((tile) => tile.letter)
      .filter((letter): letter is string => letter !== undefined);
    let chosenWord = this.getRandomWordsOfTotalLengthWithConstraints(
      pathTiles.length - (this.isPathTileDeadEnd(lastTile) ? 0 : 1),
      disallowedBeginningsLetters,
      disallowedEndingLetters,
    );

    if (chosenWord === undefined) {
      chosenWord = this.generateRandomString(
        allSurroundingTiles
          .map((tile) => tile.letter)
          .filter((tile): tile is string => tile !== undefined),
        pathTiles.length - 1,
      );
    }

    if (!this.isPathTileDeadEnd(lastTile)) {
      chosenWord += " ";
    }

    return chosenWord;
  }

  private isPathTileDeadEnd(tileCoordinate: TileCoordinate) {
    return this.gameState.getSurroundingPathTiles(tileCoordinate).length === 1;
  }

  private isPathTile(coordinate: TileCoordinate) {
    const tile = this.gameState.findTile(...coordinate);
    return tile !== null && tile.isPath;
  }

  private getOutgoingPathsToFollowNext(
    crossingTile: TileCoordinate,
    comingFromTile: TileCoordinate | null,
  ) {
    let tilePathsToGenerateWordsFor = [];
    const nextPossibleTilesToFollow = this.gameState
      .getNeighborCoordinates(crossingTile)
      .filter((tile) => this.isPathTile(tile))
      .filter((tile) => !this.isSameCoordinate(tile, comingFromTile))
      .filter((tile) => tile[0] >= 1);
    for (const tile of nextPossibleTilesToFollow) {
      const tilesTillIncludingNextCrossing: TileCoordinate[] = [];

      let previousTile = crossingTile;
      let currentTile = tile;

      while (true) {
        tilesTillIncludingNextCrossing.push(currentTile);
        const nextSurroundingTiles = this.gameState
          .getSurroundingPathTiles(currentTile)
          .filter(
            (tile) => tile.x !== previousTile[0] || tile.y !== previousTile[1],
          );

        if (nextSurroundingTiles.length !== 1 && previousTile !== null) {
          break;
        }

        previousTile = currentTile;
        currentTile = [nextSurroundingTiles[0].x, nextSurroundingTiles[0].y];
      }

      tilePathsToGenerateWordsFor.push(tilesTillIncludingNextCrossing);
    }
    return tilePathsToGenerateWordsFor;
  }

  private isSameCoordinate(
    coord1: TileCoordinate | null,
    coord2: TileCoordinate | null,
  ) {
    if (coord1 === null) {
      return coord2 === null;
    }
    if (coord2 === null) {
      return false;
    }
    return coord1[0] === coord2[0] && coord1[1] === coord2[1];
  }
}
