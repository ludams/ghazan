import { Application } from "pixi.js";
import seedrandom, { PRNG } from "seedrandom";
import { Config } from "./config.ts";
import { Tile } from "./tile.ts";

const letters = "abcdefghijklmnopqrstuvwxyz";

export class Game {
  app: Application;
  config: Config;
  tiles: Map<string, Tile> = new Map();

  constructor(app: Application, config: Config) {
    this.app = app;
    this.config = config;
  }

  createTile(x: number, y: number, letter: string): Tile {
    const tile = new Tile(this, x, y, letter);
    this.tiles.set(`${x},${y}`, tile);
    return tile;
  }

  getTile(x: number, y: number): Tile | undefined {
    return this.tiles.get(`${x},${y}`);
  }

  static randomLetter(rng: PRNG) {
    return letters[Math.floor(rng() * letters.length)];
  }

  importMaze(maze: string) {
    let rng = seedrandom("1337");

    const rows = maze.split("\n");
    for (let y = 0; y < rows.length; y++) {
      const row = rows[y];
      for (let x = 0; x < row.length; x++) {
        if (row[x] === " ") {
          this.createTile(x, y, Game.randomLetter(rng));
        } else {
        }
      }
    }
  }

  renderTiles() {
    for (const tile of this.tiles.values()) {
      tile.render(this.app);
    }
  }
}
