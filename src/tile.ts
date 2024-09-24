import { formatHex } from "culori";
import { Application, Graphics, Text, Ticker } from "pixi.js";
import { Game } from "./game.ts";

export class Tile {
  game: Game;
  x: number;
  y: number;
  letter: string;
  visitTimestamps: number[] = [];
  backTimestamps: number[] = [];
  graphics?: Graphics;
  text?: Text;
  isCurrentPlayerTile = false;
  addedListener = false;
  listener = this.updateColor.bind(this);

  constructor(game: Game, x: number, y: number, letter: string) {
    this.game = game;
    this.x = x;
    this.y = y;
    this.letter = letter;
  }

  render(app: Application) {
    const pixelSize = this.game.config.pixelSize;
    const obj = new Graphics({ x: this.x * pixelSize, y: this.y * pixelSize });
    const text = new Text({
      text: this.letter === " " ? "␣" : this.letter,
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

    obj.addChild(text);
    app.stage.addChild(obj);

    this.graphics = obj;
    this.text = text;
  }

  visit(app: Application) {
    this.visitTimestamps.push(Date.now());
    this.enter(app);
  }

  back(app: Application) {
    this.backTimestamps.push(Date.now());
    this.exit(app);
  }

  enter(app: Application) {
    this.isCurrentPlayerTile = true;
    this.registerListener(app);
  }

  exit(app: Application) {
    this.isCurrentPlayerTile = false;
    if (this.visitTimestamps.length === 0) {
      this.removeListener(app);
    }
  }

  convertToLava(app: Application) {
    let obj = this.graphics;
    let text = this.text;
    if (obj === undefined || text === undefined) {
      return;
    }
    obj
      .clear()
      .rect(0, 0, this.game.config.pixelSize, this.game.config.pixelSize)
      .fill(0xff0000);
    obj.removeChild(text);
    this.removeListener(app);
    const a = Math.random() * 0.1 + 1.0;
    const b = Math.random() * 0.1 + 1.0;
    // slowly make the lava darker
    const now = Date.now();
    app.ticker.add(() => {
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

      obj
        .clear()
        .rect(0, 0, 20, 20)
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

  private registerListener(app: Application) {
    if (this.visitTimestamps.length > 0 && !this.addedListener) {
      this.addedListener = true;
      app.ticker.add(this.listener);
    }
  }

  private removeListener(app: Application) {
    if (this.addedListener) {
      this.addedListener = false;
      app.ticker.remove(this.listener);
    }
  }

  private updateColor(_: Ticker) {
    let obj = this.graphics;
    let text = this.text;
    if (obj === undefined || text === undefined) {
      return;
    }
    const now = Date.now();
    const lastVisitTimestamp =
      this.visitTimestamps[this.visitTimestamps.length - 1];
    const timeSinceLastVisit = now - lastVisitTimestamp;
    this.updateForTimestamp(obj, text, timeSinceLastVisit);
  }

  private updateForTimestamp(
    obj: Graphics,
    text: Text,
    timeSinceLastVisit: number,
  ) {
    const pixelSize = this.game.config.pixelSize;
    const isVisited = this.visitTimestamps.length > 0;
    const isDeleted =
      this.visitTimestamps.length > 0 &&
      this.visitTimestamps.length === this.backTimestamps.length;
    if (!isVisited) {
      obj.clear();
      text.style.fill = 0xffffff;
    } else {
      text.style.fill = 0x000000;
      const backgroundColor = isDeleted
        ? 0xffffff
        : this.getColorForSnake(timeSinceLastVisit);
      obj.clear().rect(0, 0, pixelSize, pixelSize).fill(backgroundColor);
    }
  }

  private getColorForSnake(timeSinceLastVisit: number) {
    const startChroma = 0.25;
    const endChroma = this.isCurrentPlayerTile ? 0.2 : 0.15;
    const chroma =
      endChroma + (startChroma - endChroma) * 0.999 ** timeSinceLastVisit;
    const startLightness = 0.85;
    const endLightness = this.isCurrentPlayerTile ? 0.85 : 0.7;
    const lightness =
      endLightness -
      (endLightness - startLightness) * 0.999 ** timeSinceLastVisit;

    return formatHex({
      mode: "oklch",
      l: lightness,
      c: chroma,
      h: 150,
    });
  }
}
