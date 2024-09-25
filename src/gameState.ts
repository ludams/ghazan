import { Game } from "./game.ts";
import { LavaTile } from "./lavaTile.ts";
import { PathTile } from "./pathTile.ts";
import { words } from "./languages/english_1k.json";
import seedrandom from "seedrandom";

const englishWords: string[] = words;
const englishWordsMap: Map<number, string[]> = new Map();
englishWords.forEach((word) => {
  if (!englishWordsMap.has(word.length)) {
    englishWordsMap.set(word.length, []);
  }
  englishWordsMap.get(word.length)!.push(word);
});
const allWordLengths = Array.from(englishWordsMap.keys()).sort();

export class GameState {
  game: Game;
  tiles: Map<string, PathTile>;
  history: PathTile[] = [];
  startTile: PathTile;
  currentTile: PathTile;
  liquidLavaTiles: { x: number; y: number }[] = [];
  lavaTiles: Map<string, LavaTile> = new Map();
  renderedChunksCount: number;
  randomWordGenerator: () => number;

  constructor(
    game: Game,
    tiles: Map<string, PathTile>,
    startTile: PathTile,
    renderedChunksCount: number,
  ) {
    this.game = game;
    this.tiles = tiles;
    this.startTile = startTile;
    this.currentTile = startTile;
    this.renderedChunksCount = renderedChunksCount;
    this.randomWordGenerator = seedrandom(game.config.baseSeed + "Words");
  }

  start() {
    for (const tile of this.tiles.values()) {
      tile.render();
    }
    const surroundingTiles = this.getSurroundingTiles(this.currentTile);
    this.renderNextWords(surroundingTiles);
    this.currentTile.visit();
    setTimeout(() => {
      let lavaTile = new LavaTile(
        this.game,
        this.startTile.x,
        this.startTile.y,
      );
      lavaTile.increaseHeat(1);
      this.lavaTiles.set(`${lavaTile.x},${lavaTile.y}`, lavaTile);
      this.liquidLavaTiles.push({ x: lavaTile.x, y: lavaTile.y });

      setInterval(() => this.spreadLava(), 1000);
    }, 5000);
  }

  private spreadLava() {
    const lavaTiles = [...this.lavaTiles.values()];
    const lavaTileObjects = lavaTiles.map((tile) => {
      return {
        x: tile.x,
        y: tile.y,
        heat: tile.heat,
        visited:
          (this.getPathTile(tile.x, tile.y)?.visitTimestamps.length ?? 0) > 0,
      };
    });
    for (const lt of lavaTileObjects) {
      this.spreadLavaToSurroundingTiles(lt);
    }
  }

  private spreadLavaToSurroundingTiles(lavaTile: {
    x: number;
    y: number;
    heat: number;
  }) {
    let neighbours = [
      { x: lavaTile.x, y: lavaTile.y - 1 },
      { x: lavaTile.x + 1, y: lavaTile.y },
      { x: lavaTile.x, y: lavaTile.y + 1 },
      { x: lavaTile.x - 1, y: lavaTile.y },
    ].filter(({ x, y }) => {
      return x > 0 && y > 0 && y < this.game.config.chunkCellsPerGrid * 2;
    });
    for (let { x, y } of neighbours) {
      let tile = this.lavaTiles.get(`${x},${y}`);
      if (tile === undefined) {
        this.lavaTiles.set(`${x},${y}`, new LavaTile(this.game, x, y));
      } else {
        const isNeighborPath = this.tiles.has(`${x},${y}`);

        if (lavaTile.heat >= 1) {
          let heatDelta: number;
          const neighborPathTile = this.getPathTile(x, y);
          const isNeighborVisited =
            (neighborPathTile?.visitTimestamps.length ?? 0) > 0;
          if (isNeighborVisited) {
            heatDelta = 1;
          } else {
            if (isNeighborPath) {
              heatDelta = 0.34;
            } else {
              heatDelta = 0.034;
            }
          }
          tile.increaseHeat(heatDelta);
        }
      }
    }
  }

  moveTo(nextTile: PathTile) {
    this.history.push(this.currentTile);

    this.currentTile.exit();
    nextTile.visit();

    this.currentTile = nextTile;
    this.renderNextWordsIfNecessary();
  }

  moveBack() {
    const lastTile = this.history.pop() as PathTile;

    this.currentTile.back();
    lastTile.enter();

    this.currentTile = lastTile;
  }

  getPathTile(x: number, y: number): PathTile | undefined {
    return this.tiles.get(`${x},${y}`);
  }

  getSurroundingTiles(tile: PathTile): PathTile[] {
    const { x, y } = tile;
    return [
      this.getPathTile(x, y - 1),
      this.getPathTile(x + 1, y),
      this.getPathTile(x, y + 1),
      this.getPathTile(x - 1, y),
    ].filter((tile) => tile !== undefined) as PathTile[];
  }

  findNextTile(letter: string) {
    const surroundingTiles = this.getSurroundingTiles(this.currentTile);
    return surroundingTiles.find(
      (tile) =>
        tile.letter === letter &&
        (this.history.length === 0 ||
          tile !== this.history[this.history.length - 1]),
    );
  }

  private renderNextWordsIfNecessary() {
    const surroundingTiles = this.getSurroundingTiles(this.currentTile);

    // only one direction "I'm in a corridor, have one option, so I'm not at a crossing" so the algorithm must already have generated a letter for the next tile
    if (surroundingTiles.length <= 2) {
      return;
    }

    this.renderNextWords(
      surroundingTiles.filter(
        // only generate forward tiles not backwards (in the history)
        (tile) => this.history[this.history.length - 1] !== tile,
      ),
    );
  }

  private getRandomWordsOfTotalLengthWithConstraints(
    totalLength: number,
    blockedBeginnings: string[],
    blockedEndings: string[],
  ): string {
    if (englishWordsMap.has(totalLength)) {
      const possibleExactLengthWord = englishWordsMap
        .get(totalLength)!
        .filter(
          (word) =>
            !blockedBeginnings.includes(word.charAt(0)) &&
            !blockedEndings.includes(word.charAt(word.length - 1)),
        );
      if (possibleExactLengthWord.length > 0) {
        const chosenWordIndex = Math.floor(
          this.randomWordGenerator() * possibleExactLengthWord.length,
        );
        return possibleExactLengthWord[chosenWordIndex];
      }
    }

    // todo
  }

  private renderNextWords(surroundingTiles: PathTile[]) {
    const nextWordsBeginningLetters: string[] = [];
    debugger;

    for (const tile of surroundingTiles) {
      const tilesTillIncludingNextCrossing: PathTile[] = [];
      debugger;

      let lastTile: PathTile | null = null;
      let currentTile: PathTile = tile;
      while (true) {
        const nextSurroundingTiles = this.getSurroundingTiles(
          currentTile,
        ).filter((tile) => tile !== lastTile);
        if (nextSurroundingTiles.length !== 1 && lastTile !== null) {
          break;
        }
        tilesTillIncludingNextCrossing.push(currentTile);
        lastTile = currentTile;
        currentTile = nextSurroundingTiles[0];
      }

      // get restrictions for beginning (current crossing) and ending letters (next crossing)
      const chosenWord = this.getRandomWordsOfTotalLengthWithConstraints(
        tilesTillIncludingNextCrossing.length - 1,
        todo,
        todo,
      );

      nextWordsBeginningLetters.push(chosenWord.charAt(0));

      tilesTillIncludingNextCrossing.forEach((tile, index) => {
        tile.letter = chosenWord.charAt(index);
        tile.text!.text = chosenWord.charAt(index); // todo account for spaces
      });
    }
  }
}
