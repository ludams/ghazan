import { Container, Ticker } from "pixi.js";
import { Game } from "./game.ts";
import { Tile } from "./tile.ts";
import { WordGeneration } from "./word-generation.ts";

export type TileCoordinate = [number, number];

export class GameState {
  game: Game;
  tiles: Map<number, Tile> = new Map();
  tileContainer: Container;
  history: TileCoordinate[] = [];
  startCoordinate: TileCoordinate;
  currentCoordinate: TileCoordinate;
  renderedChunksCount: number;
  wordGeneration: WordGeneration;

  moveLavaListener: ((ticker: Ticker) => void) | null = null;
  centerGameListener: ((ticker: Ticker) => void) | null = null;
  gameLoopListener: (() => void) | null = null;

  playerDeathListener: ((score: number) => void) | null = null;
  playerIsDead: boolean = false;

  lastUpdateTime: number = Date.now();
  cameraFollowIntervalId: number | null = null;

  constructor(
    game: Game,
    pathCoordinates: TileCoordinate[],
    startCoordinate: TileCoordinate,
    renderedChunksCount: number,
  ) {
    this.game = game;
    this.wordGeneration = new WordGeneration(this);
    this.tileContainer = new Container({
      x: game.config.minGameTilePaddingLeft * game.config.pixelSize,
    });
    const minY = 1;
    const maxY = game.config.chunkCellsPerGrid * 2;
    const minX = 1;
    const maxX = Math.max(...pathCoordinates.map(([x]) => x)) + 1;
    for (let x = minX; x < maxX; x++) {
      for (let y = minY; y < maxY; y++) {
        const isPath = pathCoordinates.some(
          ([pathX, pathY]) => pathX === x && pathY === y,
        );
        const tile = new Tile(x, y, isPath, game.config);
        this.addTile(tile);
      }
    }

    const circleCenterX = -this.game.config.minGameTilePaddingLeft;
    const circleCenterY = this.game.config.chunkCellsPerGrid - 1;
    const circleRadius =
      this.game.config.minGameTilePaddingLeft -
      this.game.config.lavaStartOffset;

    for (let x = -this.game.config.minGameTilePaddingLeft; x <= 0; x++) {
      for (let y = 1; y < this.game.config.chunkCellsPerGrid * 2; y++) {
        let isPath = false;
        if (
          Math.pow(x - circleCenterX, 2) + Math.pow(y - circleCenterY, 2) <=
            Math.pow(circleRadius, 2) ||
          y === startCoordinate[1]
        ) {
          isPath = true;
        }

        const tile = new Tile(x, y, isPath, game.config, true);
        this.addTile(tile);
      }
    }
    this.startCoordinate = startCoordinate;
    this.currentCoordinate = startCoordinate;
    this.renderedChunksCount = renderedChunksCount;

    this.gameLoopListener = () => this.gameLoop();
    game.app.ticker.add(this.gameLoopListener);
  }

  private gameLoop() {
    const currentMinVisibleX =
      -this.tileContainer.position.x / this.game.config.pixelSize;
    const currentMaxVisibleX =
      currentMinVisibleX + this.game.config.chunkCellsPerGrid * 2 * 3;

    const now = Date.now();
    if (now - this.lastUpdateTime < 20) {
      return;
    }
    this.lastUpdateTime = now;
    let count = 0;
    let maxY = 0;
    let minY = 1000;
    for (let tile of this.tiles.values()) {
      maxY = Math.max(maxY, tile.x);
      minY = Math.min(minY, tile.x);
      const isVisible =
        tile.x >= currentMinVisibleX - 1 && tile.x <= currentMaxVisibleX + 1;
      const updated = tile.updateGraphics(
        this.currentCoordinate[0],
        this.currentCoordinate[1],
        isVisible,
      );
      if (updated) {
        count++;
      }
    }
  }

  start() {
    for (const tile of this.tiles.values()) {
      tile.updateGraphics(
        this.startCoordinate[0],
        this.startCoordinate[1],
        true,
      );
    }
    const currentTile = this.findTile(...this.startCoordinate);
    if (currentTile === null) {
      throw new Error(`Tile at ${this.startCoordinate} not found`);
    }
    for (let i = 1; i <= this.game.config.crossingsToPreFillWithWords; i++) {
      this.wordGeneration.renderNextWords(this.startCoordinate, null, i);
    }

    currentTile.visit();
    this.game.responsiveContainer.container.addChild(this.tileContainer);
    setTimeout(() => {
      let initialLavaFields = [];
      const circleCenterX = -this.game.config.minGameTilePaddingLeft;
      const circleCenterY = this.game.config.chunkCellsPerGrid - 1;
      const circleRadius =
        this.game.config.minGameTilePaddingLeft -
        this.game.config.lavaStartOffset;
      const x = -this.game.config.minGameTilePaddingLeft;
      for (let y = 0; y < this.game.config.chunkCellsPerGrid * 2; y++) {
        let tile = this.findTile(x, y);
        if (tile === null) {
          tile = new Tile(x, y, true, this.game.config, true);
          this.tileContainer.addChild(tile.graphics);
          continue;
        }
        if (
          Math.pow(x - circleCenterX, 2) + Math.pow(y - circleCenterY, 2) <=
          Math.pow(circleRadius, 2)
        ) {
          initialLavaFields.push([x, y]);
        }
      }

      for (let [x, y] of initialLavaFields) {
        const tile = this.findTile(x, y);
        if (tile === null) {
          console.warn(`Tile at ${x},${y} not found`);
          continue;
        }
        tile?.convertToLava();
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
        const lavaMoveTime = 800 / lavaSpeed;
        if (timeDelta > lavaMoveTime) {
          lastLavaTime = now;
          this.spreadLava();
          this.checkIfPlayerIsDead();
        }
      };
      this.game.app.ticker.add(moveLavaListener);
      this.moveLavaListener = moveLavaListener;
    }, 0);
    this.cameraFollowIntervalId = setInterval(() => {
      const currentMinVisibleX =
        -this.tileContainer.position.x / this.game.config.pixelSize;
      const xToRemoveBefore = currentMinVisibleX - 200;
      const tilesToRemove = [...this.tiles.values()].filter(
        (tile) => tile.x < xToRemoveBefore,
      );
      for (let tile of tilesToRemove) {
        tile.destroy();
        this.tiles.delete(this.convertCoordinatesToIndex(tile.x, tile.y));
      }
    }, 1000);
    let centerGameListener = (ticker: Ticker) => {
      this.tryToCenterGame(ticker);
    };
    this.game.app.ticker.add(centerGameListener);
    this.centerGameListener = centerGameListener;
  }

  findTile(x: number, y: number) {
    const index = this.convertCoordinatesToIndex(x, y);
    return this.tiles.get(index) ?? null;
  }

  addTile(tile: Tile) {
    this.tileContainer.addChild(tile.graphics);
    this.tiles.set(this.convertCoordinatesToIndex(tile.x, tile.y), tile);
  }

  private computeLavaSpeed(lavaDistanceWithBaseSpeed: number) {
    const playerX = this.currentCoordinate[0];
    const furthestLavaX = Math.max(
      ...[...this.tiles.values()]
        .filter((tile) => tile.getHeat() >= 1)
        .map((tile) => tile.x),
    );
    const distanceToLava = playerX - furthestLavaX;
    const bufferedDistance = Math.max(
      distanceToLava - lavaDistanceWithBaseSpeed,
      0,
    );
    const baseSpeed = playerX <= 0 ? 1 : (playerX + 9) / 50;

    return 1.1 ** bufferedDistance * baseSpeed;
  }

  private tryToCenterGame(ticker: Ticker) {
    const playerPixelX = this.currentCoordinate[0] * this.game.config.pixelSize;
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

    const spring = 0.001;
    this.tileContainer.position.x =
      this.tileContainer.position.x + diff * spring * ticker.deltaMS;
  }

  private spreadLava() {
    const currentMinVisibleX =
      -this.tileContainer.position.x / this.game.config.pixelSize;
    const xToRemoveBefore = currentMinVisibleX - 200;
    for (let tile of this.tiles.values()) {
      if (tile.x < xToRemoveBefore) {
        continue;
      }
      tile.simulateHeat((x, y) => {
        return this.findTile(x, y)?.getHeat() ?? 0;
      });
    }
  }

  moveTo(nextTile: Tile) {
    const currentTile = this.findTile(...this.currentCoordinate);
    if (currentTile === null) {
      throw new Error(`Tile at ${this.currentCoordinate} not found`);
    }
    this.history.push(this.currentCoordinate);

    currentTile.exit();
    nextTile.visit();
    this.updateHighlighting(currentTile, nextTile);

    this.currentCoordinate = [nextTile.x, nextTile.y];

    this.checkIfPlayerIsDead();

    this.wordGeneration.renderNextWordsIfNecessary();
  }

  private updateHighlighting(oldTile: Tile, nextTile: Tile) {
    const oldNeighbors = this.getSurroundingPathTiles([oldTile.x, oldTile.y]);
    for (const neighbor of oldNeighbors) {
      neighbor.setIsNextPlayerTile(false);
    }
    const neighbors = this.getSurroundingPathTiles([nextTile.x, nextTile.y]);
    for (const neighbor of neighbors) {
      const neighborCoordinates = [neighbor.x, neighbor.y];
      let lastTile = this.history[this.history.length - 1];
      if (lastTile === undefined) {
        continue;
      }
      if (
        neighborCoordinates[0] === lastTile[0] &&
        neighborCoordinates[1] === lastTile[1]
      ) {
        continue;
      }
      neighbor.setIsNextPlayerTile(true);
    }
  }

  moveBackChar(): Tile | null {
    if (this.playerIsDead) {
      return null;
    }
    const currentTile = this.findTile(...this.currentCoordinate);
    if (currentTile === null) {
      throw new Error(`Tile at ${this.currentCoordinate} not found`);
    }
    const lastTileCoordinate = this.history.pop();
    if (lastTileCoordinate === undefined) {
      return null;
    }

    const lastTile = this.findTile(...lastTileCoordinate);
    if (lastTile === null) {
      throw new Error(`Tile at ${this.currentCoordinate} not found`);
    }

    currentTile.back();
    lastTile.enter();
    this.updateHighlighting(currentTile, lastTile);

    this.currentCoordinate = lastTileCoordinate;

    this.checkIfPlayerIsDead();

    return lastTile;
  }

  moveBackWord() {
    const newCurrentTile = this.moveBackChar();

    if (
      newCurrentTile === null ||
      newCurrentTile.letter === " " ||
      this.history.length === 0
    ) {
      return;
    }

    this.moveBackWord();
  }

  getSurroundingPathTiles(coord: TileCoordinate) {
    return this.getNeighborIndices(coord)
      .map((index) => this.tiles.get(index))
      .filter((tile) => tile !== undefined && tile.isPath) as Tile[];
  }

  private getNeighborIndices(coord: TileCoordinate) {
    return this.getNeighborCoordinates(coord).map(([x, y]) =>
      this.convertCoordinatesToIndex(x, y),
    );
  }

  getNeighborCoordinates(coord: TileCoordinate): TileCoordinate[] {
    const [x, y] = coord;
    return [
      [x, y - 1],
      [x + 1, y],
      [x, y + 1],
      [x - 1, y],
    ];
  }

  findNextTile(letter: string) {
    const surroundingTiles = this.getSurroundingPathTiles(
      this.currentCoordinate,
    );
    let lastTile: Tile | null = null;
    if (this.history.length > 0) {
      const lastTileCoordinate = this.history[this.history.length - 1];
      lastTile = this.findTile(lastTileCoordinate[0], lastTileCoordinate[1]);
    }
    return surroundingTiles.find(
      (tile) =>
        tile.letter === letter &&
        (this.history.length === 0 || tile !== lastTile),
    );
  }

  addPaths(coordinates: TileCoordinate[]) {
    const highestX = Math.max(
      ...Array(...this.tiles.values()).map((tile) => tile.x),
    );
    const highestGeneratedX = Math.max(
      ...coordinates.map(([x, _]) => x),
      highestX,
    );
    for (let x = highestX + 1; x <= highestGeneratedX; x++) {
      for (let y = 1; y < this.game.config.chunkCellsPerGrid * 2; y++) {
        const isPath = coordinates.some(
          ([pathX, pathY]) => pathX === x && pathY === y,
        );
        const tile = new Tile(x, y, isPath, this.game.config);
        this.addTile(tile);
      }
    }
  }

  convertCoordinatesToIndex(x: number, y: number) {
    return x * (this.game.config.chunkCellsPerGrid * 2 + 1) + y;
  }

  convertIndexToCoordinates(index: number) {
    const y = index % (this.game.config.chunkCellsPerGrid * 2 + 1);
    const x = (index - y) / (this.game.config.chunkCellsPerGrid * 2 + 1);
    return [x, y];
  }

  onPlayerDeath(listener: (score: number) => void) {
    this.playerDeathListener = listener;
  }

  checkIfPlayerIsDead() {
    const [x, y] = this.currentCoordinate;
    const tile = this.findTile(x, y);
    if (tile !== null && tile.getHeat() >= 1) {
      console.log("You died!");
      if (this.playerDeathListener !== null) {
        this.playerDeathListener(x);
      }
      this.playerIsDead = true;
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
    if (this.gameLoopListener !== null) {
      this.game.app.ticker.remove(this.gameLoopListener);
      this.gameLoopListener = null;
    }
  }

  destroy() {
    this.removeListeners();
    if (this.cameraFollowIntervalId) {
      clearInterval(this.cameraFollowIntervalId);
    }
    for (let tile of this.tiles.values()) {
      tile.destroy();
    }
    this.game.responsiveContainer.container.removeChild(this.tileContainer);
    this.tileContainer.destroy();
  }
}
