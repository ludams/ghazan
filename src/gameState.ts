import { Game } from "./game.ts";
import { Tile } from "./tile.ts";

export class GameState {
  game: Game;
  tiles: Map<string, Tile>;
  history: Tile[] = [];
  currentTile: Tile;
  liquidLavaTiles: Tile[] = [];
  solidLavaTiles: Map<string, Tile> = new Map();

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
    setTimeout(() => {
      this.liquidLavaTiles.push(this.getTile(1, 1)!);
      setInterval(() => {
        this.spreadLava();
      }, 1000);
    }, 10000);
  }

  private spreadLava() {
    const lavaTiles = this.liquidLavaTiles;
    for (let lavaTile of lavaTiles) {
      this.solidLavaTiles.set(`${lavaTile.x},${lavaTile.y}`, lavaTile);
    }
    this.liquidLavaTiles = [];
    for (const lavaTile of lavaTiles) {
      this.spreadLavaToSurroundingTiles(lavaTile);
    }
    console.log(this.liquidLavaTiles.length);
  }

  private spreadLavaToSurroundingTiles(lavaTile: Tile) {
    const surroundingTiles = this.getSurroundingTiles(lavaTile);
    for (const tile of surroundingTiles) {
      if (this.solidLavaTiles.has(`${tile.x},${tile.y}`)) {
        continue;
      }
      tile.convertToLava(this.game.app);
      this.liquidLavaTiles.push(tile);
    }
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
