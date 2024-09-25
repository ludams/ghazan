import { formatHex } from "culori";
import { Graphics } from "pixi.js";
import { Game } from "./game.ts";

export class LavaTile {
  game: Game;
  x: number;
  y: number;
  heat: number = 0;
  graphics: Graphics;

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
    if (this.heat >= 0.5 && previousHeat < 1) {
      this.render();
    }
  }

  render() {
    const pixelSize = this.game.config.pixelSize;
    this.graphics.rect(0, 0, pixelSize, pixelSize).fill(0xff0000);

    const a = Math.random() * 0.1 + 1.0;
    const b = Math.random() * 0.1 + 1.0;
    const now = Date.now();

    this.game.app.ticker.add(() => {
      const timeSinceLava = Date.now() - now;
      const timeBase = 0.9998;
      let lightness = this.getAnimatedValue(0.76, 0.3, timeBase, timeSinceLava);
      const chroma = this.getAnimatedValue(0.17, 0.24, timeBase, timeSinceLava);
      const hue = this.getAnimatedValue(64, 28, timeBase, timeSinceLava);

      lightness =
        lightness +
        Math.sin((a * timeSinceLava) / 1000) *
          Math.cos((b * timeSinceLava) / 1000) *
          0.1;

      this.graphics
        .clear()
        .rect(0, 0, this.game.config.pixelSize, this.game.config.pixelSize)
        .fill(
          formatHex({
            mode: "oklch",
            l: lightness,
            c: chroma,
            h: hue,
          }),
        );
    });
  }

  private getAnimatedValue(
    startValue: number,
    endValue: number,
    timeBase: number,
    time: number,
  ) {
    return endValue - (endValue - startValue) * timeBase ** time;
  }
}
