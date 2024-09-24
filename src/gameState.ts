import { Game } from "./game.ts";
import { PathTile } from "./pathTile.ts";

export class GameState {
  game: Game;
  tiles: Map<string, PathTile>;
  history: PathTile[] = [];
  startTile: PathTile;
  currentTile: PathTile;
  liquidLavaTiles: PathTile[] = [];
  solidLavaTiles: Map<string, PathTile> = new Map();
  renderedChunksCount: number;

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
  }

  start() {
    for (const tile of this.tiles.values()) {
      tile.render();
    }
    this.currentTile.visit();
    setTimeout(() => {
      this.liquidLavaTiles.push(this.startTile);
      this.startTile.convertToLava();

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
  }

  private spreadLavaToSurroundingTiles(lavaTile: PathTile) {
    const surroundingTiles = this.getSurroundingTiles(lavaTile);
    for (const tile of surroundingTiles) {
      if (this.solidLavaTiles.has(`${tile.x},${tile.y}`)) {
        continue;
      }
      tile.convertToLava();
      this.liquidLavaTiles.push(tile);
    }
  }

  moveTo(nextTile: PathTile) {
    this.history.push(this.currentTile);

    this.currentTile.exit();
    nextTile.visit();

    this.currentTile = nextTile;
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
}
