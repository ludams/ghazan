import seedrandom from "seedrandom";
import { Config } from "./config.ts";

export class MazePixel {
  public type: "corridor" | "wall";
  public readonly x: number;
  public readonly y: number;

  constructor(type: "corridor" | "wall", x: number, y: number) {
    this.type = type;
    this.x = x;
    this.y = y;
  }
}

export class GridChunk {
  private readonly config: Config;

  public readonly rng: () => number;
  public readonly rngWallBreak: () => number;

  readonly gridIndex: number;
  private readonly grid: GridCell[][] = [];
  private readonly mazePixels: MazePixel[][] = [];

  private get chunkSeed(): string {
    return this.config.baseSeed + `GridChunk:${this.gridIndex}`;
  }

  private get chunkMazePixelHeight(): number {
    return this.config.chunkCellsPerGrid * 2 - 1;
  }

  private get chunkMazePixelWidth(): number {
    return this.config.chunkCellsPerGrid * 2;
  }

  private get numberOfWallBreaksBetweenChunks(): number {
    return Math.ceil(
      this.config.chunkCellsPerGrid * this.config.chunkConnectingWallBreakRatio,
    );
  }

  public get corridorMazePixels(): MazePixel[] {
    return this.mazePixels
      .flatMap((pixel) => pixel)
      .filter((pixel) => pixel.type === "corridor")
      .map(
        (pixel) =>
          new MazePixel(
            pixel.type,
            pixel.x + this.gridIndex * this.chunkMazePixelWidth,
            pixel.y,
          ),
      );
  }

  constructor(gridIndex: number, config: Config) {
    this.gridIndex = gridIndex;
    this.config = config;

    this.rng = seedrandom(this.chunkSeed);
    this.rngWallBreak = seedrandom(this.chunkSeed + ":WallBreak");

    this.initializeGrid();
    this.initializeMazePixels();
  }

  private initializeGrid() {
    for (let x = 0; x < this.config.chunkCellsPerGrid; x++) {
      const column = [];
      for (let y = 0; y < this.config.chunkCellsPerGrid; y++) {
        column.push(new GridCell(x, y));
      }
      this.grid.push(column);
    }
  }

  private initializeMazePixels() {
    for (let x = 0; x < this.chunkMazePixelWidth; x++) {
      const column = [];
      for (let y = 0; y < this.chunkMazePixelHeight; y++) {
        const isTypeCorridor = x % 2 === 0 && y % 2 === 0;
        column.push(new MazePixel(isTypeCorridor ? "corridor" : "wall", x, y));
      }
      this.mazePixels.push(column);
    }
  }

  public generateMaze() {
    this.buildCorridorsWithRandomizedDfs();
    this.openUpWallTowardsNextChunk();
  }

  private buildCorridorsWithRandomizedDfs() {
    let initialCell = this.grid[0][0];
    initialCell.visit();

    let lfsNeighborsToVisitStack = [initialCell];
    let lastCell: GridCell | undefined = undefined;

    while (lfsNeighborsToVisitStack.length > 0) {
      const currentCell = lfsNeighborsToVisitStack.pop()!;

      const neighbors = this.getUnvisitedNeighbors(currentCell);
      if (neighbors.length === 0) {
        if (
          lastCell === currentCell &&
          this.rng() < this.config.deadEndWallBreakRatio
        ) {
          this.connectToRandomVisitedNeighborCell(currentCell);
        }
        continue;
      }

      if (neighbors.length > 1) {
        lfsNeighborsToVisitStack.push(currentCell);
      }

      const nextCell = neighbors[Math.floor(this.rng() * neighbors.length)];
      lastCell = nextCell;
      this.connectTwoCells(currentCell, nextCell);
      nextCell.visit();
      lfsNeighborsToVisitStack.push(nextCell);
    }
  }

  private connectToRandomVisitedNeighborCell(currentCell: GridCell) {
    const visitedNeighbors = this.getDisconnectedVisitedNeighbors(currentCell);
    const neighborToConnect =
      visitedNeighbors[
        Math.floor(this.rngWallBreak() * visitedNeighbors.length)
      ];
    this.connectTwoCells(currentCell, neighborToConnect);
  }

  private getNeighbors(cell: GridCell): GridCell[] {
    let top =
      cell.gridY !== 0 ? this.grid[cell.gridX][cell.gridY - 1] : undefined;
    let right: GridCell | undefined;
    right =
      cell.gridX < this.config.chunkCellsPerGrid - 1
        ? this.grid[cell.gridX + 1][cell.gridY]
        : undefined;
    let bottom =
      cell.gridY < this.config.chunkCellsPerGrid - 1
        ? this.grid[cell.gridX][cell.gridY + 1]
        : undefined;
    let left =
      cell.gridX !== 0 ? this.grid[cell.gridX - 1][cell.gridY] : undefined;

    return [top, right, bottom, left].filter(
      (cell): cell is GridCell => cell !== undefined,
    );
  }

  private getUnvisitedNeighbors(cell: GridCell): GridCell[] {
    return this.getNeighbors(cell).filter((cell) => !cell.visited);
  }

  private getDisconnectedVisitedNeighbors(cell: GridCell): GridCell[] {
    return this.getNeighbors(cell)
      .filter((neighborCell) => !cell.connectedCells.includes(neighborCell))
      .filter((cell) => cell.visited);
  }

  private openUpWallTowardsNextChunk() {
    const wallBreakHeights = Array(this.config.chunkCellsPerGrid)
      .fill(0)
      .map((_, index) => index);

    const selectedWallBreakHeights = Array(this.numberOfWallBreaksBetweenChunks)
      .fill(0)
      .map(() => {
        const nextWallBreakHeightIndex = Math.floor(
          this.rngWallBreak() * wallBreakHeights.length,
        );
        const [nextWallBreakHeight] = wallBreakHeights.splice(
          nextWallBreakHeightIndex,
          1,
        );
        return nextWallBreakHeight;
      });

    selectedWallBreakHeights.forEach((wallBreakHeight) => {
      this.mazePixels[this.chunkMazePixelWidth - 1][2 * wallBreakHeight].type =
        "corridor";
    });
  }

  private connectTwoCells(cellA: GridCell, cellB: GridCell) {
    cellA.connectedCells.push(cellB);
    cellB.connectedCells.push(cellA);

    const mazePixelX = 2 * cellA.gridX + cellB.gridX - cellA.gridX;
    const mazePixelY = 2 * cellA.gridY + cellB.gridY - cellA.gridY;
    this.mazePixels[mazePixelX][mazePixelY].type = "corridor";
  }
}

class GridCell {
  readonly gridX: number;
  readonly gridY: number;

  visited: boolean;
  connectedCells: GridCell[] = [];

  constructor(gridX: number, gridY: number) {
    this.gridX = gridX;
    this.gridY = gridY;
    this.visited = false;
  }

  visit() {
    this.visited = true;
  }
}
