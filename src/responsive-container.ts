import { Application, Container } from "pixi.js";
import { Config } from "./config.ts";

export class ResponsiveContainer {
  public readonly container: Container;
  private readonly app: Application;
  private readonly config: Config;

  constructor(app: Application, config: Config) {
    this.app = app;
    this.config = config;
    this.container = new Container();
  }

  public init() {
    this.app.stage.addChild(this.container);
  }

  private getCurrentRequiredScale(height: number) {
    const amountOfTiles = this.config.chunkCellsPerGrid * 2 + 1;
    const totalHeightOfGameScene = amountOfTiles * this.config.pixelSize;
    return height / totalHeightOfGameScene;
  }

  public scaleStageToCanvas(height: number) {
    this.container.scale = this.getCurrentRequiredScale(height);
  }
}
