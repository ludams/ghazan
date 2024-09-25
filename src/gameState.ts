import { Container } from "pixi.js";
import { Game } from "./game.ts";
import { LavaTile } from "./lavaTile.ts";
import { PathTile } from "./pathTile.ts";

export class GameState {
  game: Game;
  tileContainer: Container;
  private pathTiles: Map<string, PathTile>;
  lavaTiles: Map<string, LavaTile> = new Map();
  lavaTilesSurroundedByLava: Set<number> = new Set();
  history: PathTile[] = [];
  startTile: PathTile;
  currentTile: PathTile;
  renderedChunksCount: number;

  moveLavaListener: (() => void) | null = null;
  centerGameListener: (() => void) | null = null;

  playerDeathListener: ((score: number) => void) | null = null;

  constructor(
    game: Game,
    pathTiles: Map<string, PathTile>,
    startTile: PathTile,
    renderedChunksCount: number,
  ) {
    this.game = game;
    this.tileContainer = new Container({
      x: game.config.minGameTilePaddingLeft * game.config.pixelSize,
    });
    this.pathTiles = pathTiles;
    pathTiles.forEach((tile) => this.tileContainer.addChild(tile.graphics));
    const startPathTiles = [];
    for (let x = -game.config.minGameTilePaddingLeft; x < startTile.x; x++) {
      const tile = this.game.createPathTile(x, startTile.y, "");
      tile.visitTimestamps.push(Date.now());
      tile.backTimestamps.push(Date.now());
      startPathTiles.push(tile);
    }

    const circleCenterX = -this.game.config.minGameTilePaddingLeft;
    const circleCenterY = this.game.config.chunkCellsPerGrid - 1;
    const circleRadius =
      this.game.config.minGameTilePaddingLeft -
      this.game.config.lavaStartOffset;

    for (let x = -this.game.config.minGameTilePaddingLeft; x < 0; x++) {
      for (let y = 0; y < this.game.config.chunkCellsPerGrid * 2; y++) {
        if (
          Math.pow(x - circleCenterX, 2) + Math.pow(y - circleCenterY, 2) <=
          Math.pow(circleRadius, 2)
        ) {
          const tile = this.game.createPathTile(x, y, "");
          tile.visitTimestamps.push(Date.now());
          tile.backTimestamps.push(Date.now());
          startPathTiles.push(tile);
        }
      }
    }
    this.addPathTiles(startPathTiles);
    this.startTile = startTile;
    this.currentTile = startTile;
    this.renderedChunksCount = renderedChunksCount;
  }

  start() {
    for (const tile of this.pathTiles.values()) {
      tile.render();
    }
    this.currentTile.visit();
    this.game.app.stage.addChild(this.tileContainer);
    setTimeout(() => {
      let initialLavaFields = [];
      const circleCenterX = -this.game.config.minGameTilePaddingLeft;
      const circleCenterY = this.game.config.chunkCellsPerGrid - 1;
      const circleRadius =
        this.game.config.minGameTilePaddingLeft -
        this.game.config.lavaStartOffset;
      const x = -this.game.config.minGameTilePaddingLeft;
      for (let y = 0; y < this.game.config.chunkCellsPerGrid * 2; y++) {
        if (
          Math.pow(x - circleCenterX, 2) + Math.pow(y - circleCenterY, 2) <=
          Math.pow(circleRadius, 2)
        ) {
          initialLavaFields.push([x, y]);
        }
      }

      for (let [x, y] of initialLavaFields) {
        let lavaTile = new LavaTile(this.game, x, y);
        lavaTile.increaseHeat(1);
        this.addLavaTile(lavaTile);
        this.addLavaTile(new LavaTile(this.game, x + 1, y));
      }

      let lastLavaTime = Date.now();
      let distanceWithLavaBaseSpeed = Math.max(
        this.game.config.maxGameTilePaddingLeft - 5,
        5,
      );
      let moveLavaListener = () => {
        const now = Date.now();
        const timeDelta = now - lastLavaTime;
        const lavaSpeed = this.computeLavaSpeed(distanceWithLavaBaseSpeed);
        const lavaMoveTime = 1500 / lavaSpeed;
        if (timeDelta > lavaMoveTime) {
          console.log(Math.round(lavaSpeed * 100) / 100, lavaMoveTime);
          lastLavaTime = now;
          this.spreadLava();
          this.checkIfPlayerIsDead();
        }
      };
      this.game.app.ticker.add(moveLavaListener);
      this.moveLavaListener = moveLavaListener;
    }, 0);
    let centerGameListener = () => {
      this.tryToCenterGame();
    };
    this.game.app.ticker.add(centerGameListener);
    this.centerGameListener = centerGameListener;
  }

  private computeLavaSpeed(lavaDistanceWithBaseSpeed: number) {
    const playerX = this.currentTile.x;
    const furthestLavaX = Math.max(
      ...[...this.lavaTiles.values()]
        .filter((tile) => tile.heat >= 1)
        .map((tile) => tile.x),
    );
    const distanceToLava = playerX - furthestLavaX;
    const bufferedDistance = Math.max(
      distanceToLava - lavaDistanceWithBaseSpeed,
      0,
    );
    const baseSpeed = Math.log(playerX) / Math.log(50) + 1;

    return 1.1 ** bufferedDistance * baseSpeed;
  }

  private tryToCenterGame() {
    const playerPixelX = this.currentTile.x * this.game.config.pixelSize;
    const borderPadding = playerPixelX + this.tileContainer.position.x;
    const minPaddingPx =
      this.game.config.minGameTilePaddingLeft * this.game.config.pixelSize;
    const maxPaddingPx =
      this.game.config.maxGameTilePaddingLeft * this.game.config.pixelSize;
    let diff = 0;
    if (borderPadding < minPaddingPx) {
      diff = minPaddingPx - borderPadding;
    } else if (borderPadding > maxPaddingPx) {
      diff = maxPaddingPx - borderPadding;
    }

    const spring = 0.01;
    this.tileContainer.position.x =
      this.tileContainer.position.x + diff * spring;
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
      if (
        this.lavaTilesSurroundedByLava.has(
          this.convertCoordinatesToNumber(lt.x, lt.y),
        )
      ) {
        continue;
      }
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
      return (
        x >= -this.game.config.minGameTilePaddingLeft &&
        y > 0 &&
        y < this.game.config.chunkCellsPerGrid * 2
      );
    });
    let allNeighborsAreLava = true;
    for (let { x, y } of neighbours) {
      let tile = this.lavaTiles.get(`${x},${y}`);
      if (tile === undefined) {
        tile = new LavaTile(this.game, x, y);
        this.addLavaTile(tile);
      } else {
        const isNeighborPath = this.pathTiles.has(`${x},${y}`);

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
      if (tile.heat < 1) {
        allNeighborsAreLava = false;
      }
    }
    if (allNeighborsAreLava && lavaTile.heat >= 1) {
      this.lavaTilesSurroundedByLava.add(
        this.convertCoordinatesToNumber(lavaTile.x, lavaTile.y),
      );
    }
  }

  moveTo(nextTile: PathTile) {
    this.history.push(this.currentTile);

    this.currentTile.exit();
    nextTile.visit();
    this.updateHighlighting(this.currentTile, nextTile);

    this.currentTile = nextTile;

    this.checkIfPlayerIsDead();
  }

  private updateHighlighting(oldTile: PathTile, nextTile: PathTile) {
    const oldNeighbors = this.getSurroundingTiles(oldTile);
    for (const neighbor of oldNeighbors) {
      neighbor.unhighlightForPress();
    }
    const neighbors = this.getSurroundingTiles(nextTile);
    for (const neighbor of neighbors) {
      if (neighbor === this.history[this.history.length - 1]) {
        continue;
      }
      neighbor.highlightForPress();
    }
  }

  moveBack() {
    if (this.history.length === 0) {
      return;
    }
    const lastTile = this.history.pop() as PathTile;

    this.currentTile.back();
    lastTile.enter();
    this.updateHighlighting(this.currentTile, lastTile);

    this.currentTile = lastTile;

    this.checkIfPlayerIsDead();
  }

  getPathTile(x: number, y: number): PathTile | undefined {
    return this.pathTiles.get(`${x},${y}`);
  }

  addLavaTile(tile: LavaTile) {
    this.lavaTiles.set(`${tile.x},${tile.y}`, tile);
    this.tileContainer.addChild(tile.graphics);
  }

  getSurroundingTiles(tile: PathTile): PathTile[] {
    const { x, y } = tile;
    return [
      this.getPathTile(x + 1, y),
      this.getPathTile(x, y - 1),
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

  addPathTiles(tiles: PathTile[]) {
    for (const tile of tiles) {
      this.pathTiles.set(`${tile.x},${tile.y}`, tile);
      this.tileContainer.addChild(tile.graphics);
      tile.render();
    }
  }

  convertCoordinatesToNumber(x: number, y: number) {
    return x * (this.game.config.chunkCellsPerGrid * 2 + 1) + y;
  }

  onPlayerDeath(listener: (score: number) => void) {
    this.playerDeathListener = listener;
  }

  checkIfPlayerIsDead() {
    const { x, y } = this.currentTile;
    const lavaTile = this.lavaTiles.get(`${x},${y}`);
    if (lavaTile !== undefined && lavaTile.heat >= 1) {
      console.log("You died!");
      this.removeListeners();
      if (this.playerDeathListener !== null) {
        this.playerDeathListener(x);
      }
    }
  }

  removeListeners() {
    if (this.moveLavaListener !== null) {
      this.game.app.ticker.remove(this.moveLavaListener);
      this.moveLavaListener = null;
    }
    if (this.centerGameListener !== null) {
      this.game.app.ticker.remove(this.centerGameListener);
      this.centerGameListener = null;
    }
  }

  destroy() {
    this.removeListeners();
    for (const tile of this.pathTiles.values()) {
      tile.destroy();
    }
    for (const tile of this.lavaTiles.values()) {
      tile.destroy();
    }
    this.game.app.stage.removeChild(this.tileContainer);
    this.tileContainer.destroy();
  }
}
