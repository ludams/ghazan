import { formatHex } from "culori";
import { Graphics, Text, Ticker } from "pixi.js";
import { Game } from "./game.ts";

export class PathTile {
  game: Game;
  x: number;
  y: number;
  letter?: string;
  visitTimestamps: number[] = [];
  backTimestamps: number[] = [];
  graphics?: Graphics;
  text?: Text;
  isCurrentPlayerTile = false;
  addedListener = false;
  listener = this.updateColor.bind(this);

  constructor(game: Game, x: number, y: number) {
    this.game = game;
    this.x = x;
    this.y = y;
  }

  render() {
    const pixelSize = this.game.config.pixelSize;
    const obj = new Graphics({ x: this.x * pixelSize, y: this.y * pixelSize });

    this.game.app.stage.addChild(obj);

    this.graphics = obj;
  }

  setLetter(letter: string) {
    const pixelSize = this.game.config.pixelSize;
    if (this.letter !== undefined) {
      return;
    }
    const text = new Text({
      text: letter === " " ? "␣" : letter,
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

  private getAnimatedValue(
    startValue: number,
    endValue: number,
    timeBase: number,
    time: number,
  ) {
    return endValue - (endValue - startValue) * timeBase ** time;
  }

  private registerListener() {
    if (this.visitTimestamps.length > 0 && !this.addedListener) {
      this.addedListener = true;
      this.game.app.ticker.add(this.listener);
    }
  }

  private removeListener() {
    if (this.addedListener) {
      this.addedListener = false;
      this.game.app.ticker.remove(this.listener);
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
    const chroma = this.getAnimatedValue(
      0.25,
      this.isCurrentPlayerTile ? 0.2 : 0.15,
      0.999,
      timeSinceLastVisit,
    );
    const lightness = this.getAnimatedValue(
      0.85,
      this.isCurrentPlayerTile ? 0.85 : 0.7,
      0.999,
      timeSinceLastVisit,
    );

    return formatHex({
      mode: "oklch",
      l: lightness,
      c: chroma,
      h: 150,
    });
  }
}
