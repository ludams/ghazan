import { formatHex } from "culori";
import { Graphics, Text } from "pixi.js";
import { Game } from "./game.ts";

export class PathTile {
  game: Game;
  x: number;
  y: number;
  letter?: string;
  visitTimestamps: number[] = [];
  backTimestamps: number[] = [];
  graphics: Graphics;
  text?: Text;
  isCurrentPlayerTile = false;
  isHighlighted: boolean = false;
  listener: (() => void) | null = null;

  unvisitedColor = 0x444444;

  constructor(game: Game, x: number, y: number) {
    this.game = game;
    this.x = x;
    this.y = y;
    this.graphics = new Graphics({
      x: this.x * this.game.config.pixelSize,
      y: this.y * this.game.config.pixelSize,
      zIndex: -1,
    });
  }

  render() {
    const pixelSize = this.game.config.pixelSize;
    this.graphics
      .clear()
      .rect(0, 0, pixelSize, pixelSize)
      .fill(this.unvisitedColor);
    this.updateColor();
  }

  setLetter(letter: string) {
    const pixelSize = this.game.config.pixelSize;
    if (this.letter !== undefined) {
      return;
    }
    const text = new Text({
      text: letter,
      style: {
        fontFamily: "Jetbrainsmono Regular",
        fontSize: this.game.config.fontSize,
        fill: 0xffffff,
      },
    });
    text.x = pixelSize / 2 - text.width / 2;
    if (this.letter === " ") {
      text.y = -0.15 * pixelSize;
    }

    this.letter = letter;
    this.text = text;
    this.graphics?.addChild(text);
    this.registerListener();
  }

  visit() {
    this.visitTimestamps.push(Date.now());
    this.enter();
  }

  back() {
    this.backTimestamps.push(Date.now());
    this.exit();
  }

  enter() {
    this.isCurrentPlayerTile = true;
    this.registerListener();
  }

  exit() {
    this.isCurrentPlayerTile = false;
    if (this.visitTimestamps.length === 0) {
      this.removeListener();
    }
  }

  private getAnimatedValueWithMiddle(
    startValue: number,
    middleValue: number,
    endValue: number,
    time: number,
    middleTime: number,
  ) {
    const k = (1 / middleTime) * 20;

    const logisticPart1 =
      startValue - (startValue - middleValue) / (1 + Math.exp(-k * time + 2));

    const logisticPart2 =
      (endValue - middleValue) / (1 + Math.exp(-k * (time - middleTime)));

    return logisticPart1 + logisticPart2;
  }

  private registerListener() {
    if (this.listener === null) {
      this.listener = () => {
        this.updateColor();
      };
      this.game.app.ticker.add(this.listener);
    }
  }

  private removeListener() {
    if (this.listener !== null) {
      this.game.app.ticker.remove(this.listener);
      this.listener = null;
    }
  }

  highlightForPress() {
    this.isHighlighted = true;
    this.updateColor();
  }

  unhighlightForPress() {
    this.isHighlighted = false;
    this.updateColor();
  }

  private updateColor() {
    if (this.isTileOutsideOfView()) {
      console.log("removing listener");
      this.removeListener();
      return;
    }
    const now = Date.now();
    const lastVisitTimestamp =
      this.visitTimestamps[this.visitTimestamps.length - 1];
    const timeSinceLastVisit = now - lastVisitTimestamp;
    this.updateForTimestamp(timeSinceLastVisit);
  }

  private updateForTimestamp(timeSinceLastVisit: number) {
    const pixelSize = this.game.config.pixelSize;
    const isVisited = this.visitTimestamps.length > 0;
    const isDeleted =
      this.visitTimestamps.length > 0 &&
      this.visitTimestamps.length === this.backTimestamps.length;
    if (!isVisited) {
      let gameState = this.game.gameState;
      let textAlpha = 1;
      if (gameState !== null) {
        const distance =
          Math.abs(gameState.currentTile.x - this.x) +
          Math.abs(gameState.currentTile.y - this.y);
        textAlpha = Math.max(0, 1 - distance / 10);
      }
      this.graphics
        .clear()
        .rect(0, 0, pixelSize, pixelSize)
        .fill(this.unvisitedColor);
      if (this.text) {
        this.text.style.fill = 0xffffff;
        this.text.alpha = textAlpha;
      }
    } else {
      let backgroundColor: number | string;
      let textAlpha: number;
      if (isDeleted) {
        backgroundColor = 0xffffff;
        textAlpha = 1;
      } else {
        backgroundColor = this.getColorForSnake(timeSinceLastVisit);
        textAlpha = this.getTextAlphaForSnake(timeSinceLastVisit);
      }

      if (this.text) {
        this.text.style.fill = 0x000000;
        this.text.alpha = textAlpha;
      }
      this.graphics
        .clear()
        .rect(0, 0, pixelSize, pixelSize)
        .fill(backgroundColor);
    }
  }

  private getTextAlphaForSnake(timeSinceLastVisit: number) {
    if (this.isCurrentPlayerTile) {
      return 0.5;
    }
    return this.getAnimatedValueWithMiddle(
      0.5,
      0.4,
      0.3,
      timeSinceLastVisit,
      3000,
    );
  }

  private isTileOutsideOfView() {
    const playerX = this.game.gameState?.currentTile.x;
    if (playerX === undefined) {
      return false;
    }
    const tileX = this.x;
    const maxPadding = this.game.config.maxGameTilePaddingLeft;
    return tileX < playerX - maxPadding - 15;
  }

  private getColorForSnake(timeSinceLastVisit: number) {
    const chroma = this.getAnimatedValueWithMiddle(
      0.25,
      this.isCurrentPlayerTile ? 0.2 : 0.15,
      this.isCurrentPlayerTile ? 0.2 : 0.1,
      timeSinceLastVisit,
      3000,
    );
    const lightness = this.getAnimatedValueWithMiddle(
      0.85,
      this.isCurrentPlayerTile ? 0.85 : 0.7,
      this.isCurrentPlayerTile ? 0.8 : 0.925,
      timeSinceLastVisit,
      3000,
    );

    return formatHex({
      mode: "oklch",
      l: lightness,
      c: chroma,
      h: 150,
    });
  }

  destroy() {
    this.graphics.destroy();
    this.removeListener();
  }
}
