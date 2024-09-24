import { Game } from "./game.ts";
import { LavaTile } from "./lavaTile.ts";
import { PathTile } from "./pathTile.ts";

export class GameState {
  game: Game;
  tiles: Map<string, PathTile>;
  history: PathTile[] = [];
  startTile: PathTile;
  currentTile: PathTile;
  liquidLavaTiles: { x: number; y: number }[] = [];
  lavaTiles: Map<string, LavaTile> = new Map();
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
