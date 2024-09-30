import "./styles.css";
import { sound } from "@pixi/sound";
import { Application, Assets } from "pixi.js";
import { Config } from "./config.ts";
import { Game } from "./game.ts";
import { generateRandomSeed } from "./random-seed.ts";

export const config: Config = {
  wallColor: 0x000000,
  pixelSize: 25,
  fontSize: 20,
  baseSeed:
    new URL(window.location.href).searchParams.get("seed") ??
    generateRandomSeed(),

  minGameTilePaddingLeft: 15,
  maxGameTilePaddingLeft: 20,
  springForce: 0.01,
  lavaStartOffset: 7,

  // Maze Generation Configs
  chunkCellsPerGrid: 16,
  deadEndWallBreakRatio: 0.75,
  chunkConnectingWallBreakRatio: 0.25,
  chunkGenerationDistance: 5,

  defaultLanguage: "english_10k",
  language:
    new URL(window.location.href).searchParams.get("lang") ?? "english_10k",
  crossingsToPreFillWithWords: 3,
  maxWordLengthToChooseInExactLengthMatchCase: 7,
  inputElement: document.getElementById("input") as HTMLInputElement,
};

const app = new Application();

Promise.all([
  Assets.load("JetBrainsMono/JetBrainsMono-Regular.woff2"),
  app.init({
    resizeTo: document.getElementById("app")!,
    backgroundColor: config.wallColor,
  }),
]).then(() => {
  startApp();
});

function startApp() {
  document.getElementById("app")!.appendChild(app.canvas);

  sound.add("pick1", "sounds/pick_1.mp3");
  sound.add("pick2", "sounds/pick_2.mp3");
  sound.add("pick3", "sounds/pick_3.mp3");
  sound.add("pick4", "sounds/pick_4.mp3");
  sound.add("pick5", "sounds/pick_5.mp3");
  sound.add("pick6", "sounds/pick_6.mp3");

  sound.add("error1", "sounds/error_1.mp3");
  sound.add("error2", "sounds/error_2.mp3");
  sound.add("error3", "sounds/error_3.mp3");
  sound.add("error4", "sounds/error_4.mp3");

  sound.add("return1", "sounds/return_1.mp3");
  sound.add("return2", "sounds/return_2.mp3");
  sound.add("return3", "sounds/return_3.mp3");
  sound.add("return4", "sounds/return_4.mp3");
  sound.add("return5", "sounds/return_5.mp3");

  sound.add("death", "sounds/death.mp3");

  sound.add("musicIntro", { url: "sounds/the_maze_intro.wav", preload: true });
  sound.add("musicLoop1", { url: "sounds/the_maze_loop_1.wav", preload: true });
  sound.add("musicLoop2", { url: "sounds/the_maze_loop_2.wav", preload: true });

  // Developer tools integration
  // @ts-ignore
  globalThis.__PIXI_APP__ = app;

  let game = new Game(app, config);
  game.start(1, config.chunkCellsPerGrid - 1);
}
