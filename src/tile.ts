import { formatHex } from "culori";
import { Graphics, Text } from "pixi.js";
import { Config } from "./config.ts";

type TileState = {
  heat: number;
  visitCount: number;
  backCount: number;
};

export class Tile {
  readonly x: number;
  readonly y: number;
  readonly isPath: boolean;
  readonly neighborCoordinates: [number, number][];

  private state: TileState = {
    heat: 0,
    visitCount: 0,
    backCount: 0,
  };
  private nextState?: TileState = undefined;

  letter?: string = undefined;

  isCurrentPlayerTile: boolean = false;
  isNextPlayerTile: boolean = false;
  lastVisitedTimestamp: number = 0;
  heatBecame1Timestamp: number = 0;

  readonly graphics: Graphics;
  private text?: Text;

  private config: Config;

  private lavaAnimationParameterA = Math.random() * 0.1 + 1.0;
  private lavaAnimationParameterB = Math.random() * 0.1 + 1.0;

  private rockLightness = Math.random() * 0.025 + 0.25;
  private wallLightness = Math.random() * 0.025 + 0.15;
  private deletedLightness = Math.random() * 0.1 + 0.9;

  constructor(
    x: number,
    y: number,
    isPath: boolean,
    config: Config,
    isStartTile: boolean = false,
  ) {
    this.x = x;
    this.y = y;
    this.isPath = isPath;
    this.neighborCoordinates = [
      [x + 1, y],
      [x, y - 1],
      [x, y + 1],
      [x - 1, y],
    ];

    this.graphics = new Graphics({
      x: this.x * config.pixelSize,
      y: this.y * config.pixelSize,
    });

    this.config = config;

    if (isStartTile) {
      this.state.visitCount = 1;
    }
    this.nextState = this.state;
  }

  setLetter(letter: string) {
    if (this.letter !== undefined) {
      console.warn("Trying to set letter on tile that already has a letter");
      return;
    }
    if (!this.isPath) {
      throw new Error("Trying to set letter on non-path tile");
    }
    let text = new Text({
      alpha: 0,
      style: {
        fontFamily: "Jetbrainsmono Regular",
        fontSize: this.config.fontSize,
        fill: 0xffffff,
      },
      text: letter,
    });
    text.x = this.config.pixelSize / 2 - text.width / 2;

    this.letter = letter;
    this.text = text;
    this.graphics.addChild(text);
  }

  visit() {
    this.lastVisitedTimestamp = Date.now();
    this.updateState(({ visitCount }) => ({ visitCount: visitCount + 1 }));
    this.enter();
  }

  back() {
    this.updateState(({ backCount }) => ({ backCount: backCount + 1 }));
    this.exit();
  }

  enter() {
    this.isCurrentPlayerTile = true;
  }

  exit() {
    this.isCurrentPlayerTile = false;
  }

  simulateHeat(getHeat: (x: number, y: number) => number) {
    if (this.state.heat >= 1) {
      return;
    }
    let neighborHeatSum = this.neighborCoordinates.filter(([x, y]) => {
      return getHeat(x, y) >= 1;
    }).length;
    let heatDelta = neighborHeatSum * this.getHeatFactor();
    if (heatDelta > 0) {
      this.updateState(({ heat }) => ({ heat: Math.min(1, heat + heatDelta) }));
    }
  }

  getHeatFactor() {
    if (!this.isPath) {
      return 1 / 30;
    }
    if (!this.isVisited()) {
      return 1 / 3;
    }
    return 1;
  }

  isVisited() {
    return this.state.visitCount > 0;
  }

  updateState(update: (previousState: TileState) => Partial<TileState>) {
    const currentState: TileState = this.nextState ?? this.state;
    let stateUpdate = update(currentState);
    const newState = {
      ...currentState,
      ...stateUpdate,
    };
    if (currentState.heat < 1 && newState.heat >= 1) {
      this.heatBecame1Timestamp = Date.now();
    }
    this.nextState = newState;
  }

  updateGraphics(
    playerX: number,
    playerY: number,
    isVisible: boolean,
  ): boolean {
    if (this.nextState === undefined && !isVisible) {
      return false;
    }
    let updated = false;
    const distance = Math.abs(playerX - this.x) + Math.abs(playerY - this.y);
    if (this.nextState !== undefined) {
      this.state = this.nextState;
      this.nextState = undefined;
      this.renderStateChange(distance);
      return true;
    } else {
      if (this.state.heat >= 1) {
        this.updateLavaAnimation();
        updated = true;
      } else if (this.isPath) {
        const isDeleted =
          this.state.visitCount > 0 &&
          this.state.visitCount === this.state.backCount;
        if (this.text && distance < 12 && !isDeleted) {
          this.text.alpha = Math.max(0, 1 - distance / 10);
          updated = true;
        }
        if (this.state.visitCount > this.state.backCount) {
          this.updatePathAnimation();
          updated = true;
        }
      }
      return updated;
    }
  }

  private updateLavaAnimation() {
    const timeSinceLava = Date.now() - this.heatBecame1Timestamp;
    this.graphics.tint = this.computeLavaColor(
      timeSinceLava,
      this.lavaAnimationParameterA,
      this.lavaAnimationParameterB,
    );

    this.text?.destroy();
  }

  private updatePathAnimation() {
    const timeSinceLastVisit = Date.now() - this.lastVisitedTimestamp;
    this.graphics.tint = this.getColorForSnake(timeSinceLastVisit);
    if (this.text) {
      this.text.alpha = this.getTextAlphaForSnake(timeSinceLastVisit);
    }
  }

  getHeat() {
    return this.state.heat;
  }

  convertToLava() {
    this.updateState(() => ({ heat: 1 }));
  }

  setIsNextPlayerTile(isNextPlayerTile: boolean) {
    this.isNextPlayerTile = isNextPlayerTile;
  }

  private renderStateChange(distanceToPlayer: number) {
    if (this.state.heat >= 1) {
      this.graphics
        .clear()
        .rect(0, 0, this.config.pixelSize, this.config.pixelSize)
        .fill(0xffffff);
      this.graphics.tint = this.computeLavaColor(0, 1, 1);

      this.text?.destroy();
    } else if (this.isPath) {
      this.updatePathColor(distanceToPlayer);
    } else {
      this.graphics
        .clear()
        .rect(0, 0, this.config.pixelSize, this.config.pixelSize)
        .fill(
          formatHex({
            mode: "oklch",
            l: this.wallLightness,
            c: 0,
            h: 0,
          }),
        );
    }
  }

  private updatePathColor(distanceToPlayer: number) {
    const now = Date.now();
    const timeSinceLastVisit = now - this.lastVisitedTimestamp;
    const pixelSize = this.config.pixelSize;
    const isVisited = this.state.visitCount > 0;
    const isDeleted =
      this.state.visitCount > 0 &&
      this.state.visitCount === this.state.backCount;
    if (!isVisited) {
      this.graphics
        .clear()
        .rect(0, 0, pixelSize, pixelSize)
        .fill(
          formatHex({
            mode: "oklch",
            l: this.rockLightness,
            c: 0,
            h: 0,
          }),
        );
      if (this.text) {
        // compute based on distance to player
        this.text.style.fill = 0xffffff;
        this.text.alpha = Math.max(0, 1 - distanceToPlayer / 10);
      }
    } else {
      if (this.text) {
        this.text.style.fill = 0x000000;
        this.text.alpha = isDeleted
          ? 0.8
          : this.getTextAlphaForSnake(timeSinceLastVisit);
      }
      this.graphics.clear().rect(0, 0, pixelSize, pixelSize).fill(0xffffff);
      this.graphics.tint = isDeleted
        ? formatHex({
            mode: "oklch",
            l: this.deletedLightness,
            c: 0,
            h: 0,
          })
        : this.getColorForSnake(timeSinceLastVisit);
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

  private getAnimatedValue(
    startValue: number,
    endValue: number,
    timeBase: number,
    time: number,
  ) {
    return endValue - (endValue - startValue) * timeBase ** time;
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

  destroy() {
    this.graphics.destroy();
    if (this.text) {
      this.text.destroy();
    }
  }
}
