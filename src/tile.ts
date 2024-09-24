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
      text: this.letter,
      style: {
        fontFamily: "Jetbrainsmono Regular",
        fontSize: this.game.config.fontSize,
        fill: 0xffffff,
      },
    });
    text.x = pixelSize / 2 - text.width / 2;

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
    this.updateTickListener(app);
  }

  exit(app: Application) {
    this.isCurrentPlayerTile = false;
    this.updateTickListener(app);
  }

  private updateTickListener(app: Application) {
    if (this.visitTimestamps.length > 0) {
      if (!this.addedListener) {
        this.addedListener = true;
        app.ticker.add(this.listener);
      }
    } else {
      if (this.addedListener) {
        this.addedListener = false;
        app.ticker.remove(this.listener);
      }
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
