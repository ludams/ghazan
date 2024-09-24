import { Application } from "pixi.js";
import seedrandom, { PRNG } from "seedrandom";
import { Config } from "./config.ts";
import { Tile } from "./tile.ts";
import { GridChunk } from "./maze-generation.ts";

const letters = "abcdefghijklmnopqrstuvwxyz ";

class GameState {
  game: Game;
  tiles: Map<string, Tile>;
  history: Tile[] = [];
  currentTile: Tile;

  constructor(game: Game, tiles: Map<string, Tile>, startTile: Tile) {
    this.game = game;
    this.tiles = tiles;
    this.currentTile = startTile;
  }

  start() {
    for (const tile of this.tiles.values()) {
      tile.render(this.game.app);
    }
    this.currentTile.visit(this.game.app);
  }

  moveTo(nextTile: Tile) {
    this.history.push(this.currentTile);

    this.currentTile.exit(this.game.app);
    nextTile.visit(this.game.app);

    this.currentTile = nextTile;
  }

  moveBack() {
    const lastTile = this.history.pop() as Tile;

    this.currentTile.back(this.game.app);
    lastTile.enter(this.game.app);

    this.currentTile = lastTile;
  }

  getTile(x: number, y: number): Tile | undefined {
    return this.tiles.get(`${x},${y}`);
  }

  getSurroundingTiles(tile: Tile): Tile[] {
    const { x, y } = tile;
    return [
      this.getTile(x, y - 1),
      this.getTile(x + 1, y),
      this.getTile(x, y + 1),
      this.getTile(x - 1, y),
    ].filter((tile) => tile !== undefined) as Tile[];
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
}

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

  createTile(x: number, y: number, letter: string): Tile {
    return new Tile(this, x, y, letter);
  }

  private generateMazeForIndex(index: number) {
    const rng = seedrandom(this.config.baseSeed + "Letters:" + index);
    const newGridChunk = new GridChunk(index, this.config);
    newGridChunk.generateMaze();
    return newGridChunk.corridorMazePixels.map((pixel) =>
      this.createTile(pixel.x + 1, pixel.y + 1, Game.randomLetter(rng)),
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
