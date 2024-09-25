import { formatHex } from "culori";
import { Graphics } from "pixi.js";
import { Game } from "./game.ts";

export class LavaTile {
  game: Game;
  x: number;
  y: number;
  heat: number = 0;
  graphics: Graphics;
  listener: (() => void) | null = null;

  constructor(game: Game, x: number, y: number) {
    this.game = game;
    this.x = x;
    this.y = y;
    this.graphics = new Graphics({
      x: this.x * this.game.config.pixelSize,
      y: this.y * this.game.config.pixelSize,
    });
  }

  increaseHeat(heatDelta: number) {
    const previousHeat = this.heat;
    this.heat = Math.min(1, this.heat + heatDelta);
    if (this.heat >= 1 && previousHeat < 1 && !this.isTileOutsideOfView()) {
      this.render();
    }
  }

  render() {
    const pixelSize = this.game.config.pixelSize;

    const a = Math.random() * 0.1 + 1.0;
    const b = Math.random() * 0.1 + 1.0;

    this.graphics
      .rect(0, 0, pixelSize, pixelSize)
      .fill(this.computeLavaColor(0, a, b));

    const now = Date.now();

    let listener = () => {
      if (this.isTileOutsideOfView()) {
        this.removeListener();
        return;
      }
      let color = this.computeLavaColor(Date.now() - now, a, b);
      this.graphics
        .clear()
        .rect(0, 0, this.game.config.pixelSize, this.game.config.pixelSize)
        .fill(color);
    };
    this.game.app.ticker.add(listener);
    this.listener = listener;
  }

  private computeLavaColor(timeSinceLava: number, a: number, b: number) {
    const timeBase = 0.9998;
    let lightness = this.getAnimatedValue(0.76, 0.3, timeBase, timeSinceLava);
    const chroma = this.getAnimatedValue(0.17, 0.24, timeBase, timeSinceLava);
    const hue = this.getAnimatedValue(64, 28, timeBase, timeSinceLava);

    lightness =
      lightness +
      Math.sin((a * timeSinceLava) / 1000) *
        Math.cos((b * timeSinceLava) / 1000) *
        0.1;

    return formatHex({
      mode: "oklch",
      l: lightness,
      c: chroma,
      h: hue,
    });
  }

  private removeListener() {
    if (this.listener !== null) {
      this.game.app.ticker.remove(this.listener);
      this.listener = null;
    }
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

  private getAnimatedValue(
    startValue: number,
    endValue: number,
    timeBase: number,
    time: number,
  ) {
    return endValue - (endValue - startValue) * timeBase ** time;
  }

  destroy() {
    this.graphics.destroy();
    this.removeListener();
  }
}
