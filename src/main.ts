import "./styles.css";
import { Application, Assets } from "pixi.js";
import { Config } from "./config.ts";
import { Game } from "./game.ts";
// import maze1String from "./mazes/maze1.txt?raw";

export const config: Config = {
  wallColor: 0x000000,
  pixelSize: 20,
  fontSize: 15,
  baseSeed: "1337",

  // Maze Generation Configs
  chunkCellsPerGrid: 19,
  deadEndWallBreakRatio: 1,
  chunkConnectingWallBreakRatio: 0.25,
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
  // game.importMaze(maze1String as string);
  game.start(1, 1);
}
