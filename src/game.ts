import { sound } from "@pixi/sound";
import { Application, Text } from "pixi.js";
import { Config } from "./config.ts";
import { GameState, TileCoordinate } from "./gameState.ts";
import { GridChunk } from "./maze-generation.ts";
import { Tile } from "./tile.ts";
import { VisualViewportListener } from "./visual-viewport-listener.ts";
import { ResponsiveContainer } from "./responsive-container.ts";

export class Game {
  app: Application;
  config: Config;
  gameState: GameState | null = null;
  visualViewportListener: VisualViewportListener;
  responsiveContainer: ResponsiveContainer;

  constructor(app: Application, config: Config) {
    this.app = app;
    this.responsiveContainer = new ResponsiveContainer(app, config);
    this.visualViewportListener = new VisualViewportListener(app);
    this.config = config;
  }
  private generateMazeForIndex(index: number): [number, number][] {
    const newGridChunk = new GridChunk(index, this.config);
    newGridChunk.generateMaze();
    return newGridChunk.corridorMazePixels.map(({ x, y }) => [x + 1, y + 1]);
  }

  async start(x: number, y: number) {
    await this.resetGameState(x, y);
    let gameState = this.gameState;
    if (gameState === null) {
      throw new Error("Game state is null");
    }

    let currentSong = "musicIntro";
    const playRandomMusic = () => {
      currentSong = Math.random() < 0.5 ? "musicLoop1" : "musicLoop2";
      sound.play(currentSong, {
        complete: playRandomMusic,
        volume: 0.5,
        end: 17,
      });
    };

    sound.play(currentSong, {
      volume: 0.5,
      end: 17,
      complete: () => {
        playRandomMusic();
      },
    });

    gameState.onPlayerDeath((score) => {
      gameState!.destroy();
      sound.stop(currentSong);
      sound.play("death");
      this.displayGameOver(score);
    });

    this.config.inputElement.addEventListener("beforeinput", (event) =>
      this.handleInput(event)
    );

    this.config.inputElement.focus();

    this.responsiveContainer.init();
    this.visualViewportListener.init();

    this.visualViewportListener.subscribeToViewportChanges((_, height) => {
      this.responsiveContainer.scaleStageToCanvas(height);
    });
    this.visualViewportListener.notifyListenersOfCurrentViewportDimensions();
  }

  displayGameOver(score: number) {
    const gameOverText = new Text({
      text: "Game Over",
      style: {
        fontFamily: "Jetbrainsmono Regular",
        fontSize: this.config.fontSize,
        fill: 0xffffff,
      },
    });
    const scoreText = new Text({
      text: `Score: ${score}`,
      style: {
        fontFamily: "Jetbrainsmono Regular",
        fontSize: this.config.fontSize,
        fill: 0xffffff,
      },
    });

    const setGameOverTextsPositions = (width: number, height: number) => {
      gameOverText.x = width / 2 - gameOverText.width / 2;
      gameOverText.y = height / 2 - gameOverText.height / 2;
      scoreText.x = width / 2 - scoreText.width / 2;
      scoreText.y = height / 2 + scoreText.height;
    };

    setGameOverTextsPositions(this.app.screen.width, this.app.screen.height);
    this.app.stage.addChild(gameOverText);
    this.app.stage.addChild(scoreText);

    this.visualViewportListener.subscribeToViewportChanges((width, height) =>
      setGameOverTextsPositions(width, height)
    );
  }

  private async resetGameState(x: number, y: number) {
    const initiallyRenderedChunkCount = this.config.chunkGenerationDistance;
    const tiles = this.createInitialTilesMap(initiallyRenderedChunkCount);

    let startCoordinate: TileCoordinate = [x, y];
    this.gameState = new GameState(
      this,
      tiles,
      startCoordinate,
      initiallyRenderedChunkCount
    );
    await this.gameState.start();
  }

  private createInitialTilesMap(initialChunkCount: number): [number, number][] {
    return Array(initialChunkCount)
      .fill(0)
      .flatMap((_, index) => this.generateMazeForIndex(index));
  }

  handleInput(event: InputEvent) {
    const gameState = this.gameState;
    if (gameState === null || gameState.playerIsDead) {
      event.preventDefault();
      return;
    }

    let nextTile: Tile | undefined = undefined;
    if (event.inputType.startsWith("insert")) {
      if (event.data!.length > 1) {
        event.preventDefault();
      }
      nextTile = gameState.findNextTile(event.data!);
    }

    if (nextTile !== undefined) {
      sound.play(`pick${Math.floor(Math.random() * 6) + 1}`);
      gameState.moveTo(nextTile);
      this.renderNextChunkIfNecessary(gameState);
    } else if (
      event.inputType === "deleteContentBackward" &&
      history.length > 0
    ) {
      sound.play(`return${Math.floor(Math.random() * 5) + 1}`);
      gameState.moveBackChar();
    } else if (event.inputType === "deleteWordBackward" && history.length > 0) {
      sound.play(`return${Math.floor(Math.random() * 5) + 1}`);
      gameState.moveBackWord();
    } else {
      sound.play(`error${Math.floor(Math.random() * 4) + 1}`);
    }
  }

  private renderNextChunkIfNecessary(gameState: GameState) {
    const tilesPerChunk = this.config.chunkCellsPerGrid * 2;
    const shouldRenderNextChunk =
      gameState.currentCoordinate[0] / tilesPerChunk >
      gameState.renderedChunksCount - this.config.chunkGenerationDistance;
    if (shouldRenderNextChunk) {
      this.renderNextChunk(gameState);
    }
  }

  private renderNextChunk(gameState: GameState) {
    const newTilesToRender = this.generateMazeForIndex(
      gameState.renderedChunksCount
    );
    gameState.addPaths(newTilesToRender);
    gameState.renderedChunksCount++;
  }
}
