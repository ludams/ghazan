import { Application } from "pixi.js";
import seedrandom, { PRNG } from "seedrandom";
import { Config } from "./config.ts";
import { GameState } from "./gameState.ts";
import { GridChunk } from "./maze-generation.ts";
import { PathTile } from "./pathTile.ts";

const letters = "a";

export class Game {
  app: Application;
  config: Config;
  gameState: GameState | null = null;

  constructor(app: Application, config: Config) {
    this.app = app;
    this.config = config;
  }

  static randomLetter(rng: PRNG) {
    return letters[Math.floor(rng() * letters.length)];
  }

  createPathTile(x: number, y: number, letter: string): PathTile {
    return new PathTile(this, x, y, letter);
  }

  private generateMazeForIndex(index: number) {
    const rng = seedrandom(this.config.baseSeed + "Letters:" + index);
    const newGridChunk = new GridChunk(index, this.config);
    newGridChunk.generateMaze();
    return newGridChunk.corridorMazePixels.map((pixel) =>
      this.createPathTile(pixel.x + 1, pixel.y + 1, Game.randomLetter(rng)),
    );
  }

  start(x: number, y: number) {
    this.resetGameState(x, y);

    window.addEventListener("keydown", (event: KeyboardEvent) => {
      const enteredLetter = event.key;
      this.handleInput(enteredLetter);
    });
  }

  private resetGameState(x: number, y: number) {
    const initiallyRenderedChunkCount = this.config.chunkGenerationDistance;
    const tiles = this.createInitialTilesMap(initiallyRenderedChunkCount);

    let startTile = tiles.get(`${x},${y}`);
    if (startTile === undefined) {
      throw new Error(`Tile at ${x},${y} not found`);
    }
    this.gameState = new GameState(
      this,
      tiles,
      startTile,
      initiallyRenderedChunkCount,
    );
    this.gameState.start();
  }

  private createInitialTilesMap(initialChunkCount: number) {
    return new Map<string, PathTile>(
      Array(initialChunkCount)
        .fill(0)
        .flatMap((_, index) => this.generateMazeForIndex(index))
        .map((tile) => [`${tile.x},${tile.y}`, tile]),
    );
  }

  handleInput(letter: string) {
    const gameState = this.gameState;
    if (gameState === null) {
      return;
    }
    const nextTile = gameState.findNextTile(letter);

    if (nextTile !== undefined) {
      gameState.moveTo(nextTile);
      this.renderNextChunkIfNecessary(gameState);
    } else if (letter === "Backspace" && history.length > 0) {
      gameState.moveBack();
    }
  }

  private renderNextChunkIfNecessary(gameState: GameState) {
    const tilesPerChunk = this.config.chunkCellsPerGrid * 2;
    const shouldRenderNextChunk =
      gameState.currentTile.x / tilesPerChunk >
      gameState.renderedChunksCount - this.config.chunkGenerationDistance;
    if (shouldRenderNextChunk) {
      this.renderNextChunk(gameState);
    }
  }

  private renderNextChunk(gameState: GameState) {
    const newTilesToRender = this.generateMazeForIndex(
      gameState.renderedChunksCount,
    );
    gameState.addPathTiles(newTilesToRender);
    gameState.renderedChunksCount++;
    newTilesToRender.forEach((tile) => tile.render());
  }
}
