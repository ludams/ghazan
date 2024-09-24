import { Application } from "pixi.js";
import seedrandom, { PRNG } from "seedrandom";
import { Config } from "./config.ts";
import { GameState } from "./gameState.ts";
import { PathTile } from "./pathTile.ts";
import { GridChunk } from "./maze-generation.ts";

const letters = "abcdefghijklmnopqrstuvwxyz ";

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
    const tiles = new Map(
      this.generateMazeForIndex(0).map((tile) => [`${tile.x},${tile.y}`, tile]),
    );
    let startTile = tiles.get(`${x},${y}`);
    if (startTile === undefined) {
      throw new Error(`Tile at ${x},${y} not found`);
    }
    this.gameState = new GameState(this, tiles, startTile);
    this.gameState.start();
  }

  handleInput(letter: string) {
    const gameState = this.gameState;
    if (gameState === null) {
      return;
    }
    const nextTile = gameState.findNextTile(letter);

    if (nextTile !== undefined) {
      gameState.moveTo(nextTile);
    } else if (letter === "Backspace" && history.length > 0) {
      gameState.moveBack();
    }
  }
}
