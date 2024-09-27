import { Application } from "pixi.js";
import { Config } from "./config.ts";

export function makeGameSceneResponsive(app: Application, config: Config) {
  const resize = () => resizeGameSceneToFitScreen(app, config);
  window.addEventListener("resize", resize);
  const tryResizeMultipleTimes = () => {
    Array(20)
      .fill(0)
      .forEach((_, step) => {
        setTimeout(resize, step * 200);
      });
  };
  const inputElement = document.getElementById("input");
  inputElement?.addEventListener("focus", tryResizeMultipleTimes);
  inputElement?.addEventListener("blur", tryResizeMultipleTimes);

  resize();
}

export function getTotalHeightOfGameScene(config: Config) {
  const amountOfTiles = config.chunkCellsPerGrid * 2 + 2;
  return amountOfTiles * config.pixelSize;
}

export function getScaleRatio(config: Config): number {
  const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
  const totalHeightOfGameScene = getTotalHeightOfGameScene(config);
  return viewportHeight / totalHeightOfGameScene;
}

function resizeGameSceneToFitScreen(app: Application, config: Config) {
  app.stage.scale = getScaleRatio(config);
  app.resize();
}
