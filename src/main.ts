import "./styles.css";
import { Application, Assets } from "pixi.js";
import { Config } from "./config.ts";
import { Game } from "./game.ts";

export const config: Config = {
  wallColor: 0x000000,
  pixelSize: 25,
  fontSize: 20,
  baseSeed: "1337",

  // Maze Generation Configs
  chunkCellsPerGrid: 16,
  deadEndWallBreakRatio: 0.25,
  chunkConnectingWallBreakRatio: 0.25,
  chunkGenerationDistance: 5,
};

const app = new Application();

Promise.all([
  Assets.load("JetBrainsMono/JetBrainsMono-Regular.woff2"),
  app.init({ resizeTo: window, backgroundColor: config.wallColor }),
]).then(() => {
  startApp();
});

function startApp() {
  document.getElementById("app")!.appendChild(app.canvas);
  // Developer tools integration
  // @ts-ignore
  globalThis.__PIXI_APP__ = app;

  let game = new Game(app, config);
  game.start(1, 1);
}
