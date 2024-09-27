import { Application } from "pixi.js";
import { Config } from "./config.ts";

export function makeGameSceneResponsive(app: Application, config: Config) {
  const resize = () => resizeGameSceneToFitScreen(app, config);
  window.addEventListener("resize", resize);
  const tryResizeMultipleTimes = () => {
    Array(10)
      .fill(0)
      .forEach((_, step) => {
        setTimeout(resize, step * 100);
      });
  };
  const inputElement = document.getElementById("input");
  inputElement?.addEventListener("focus", tryResizeMultipleTimes);
  inputElement?.addEventListener("blur", tryResizeMultipleTimes);

  resize();
}

function resizeGameSceneToFitScreen(app: Application, config: Config) {
  const viewportHeight = window.visualViewport?.height ?? window.innerHeight;

  const amountOfTiles = config.chunkCellsPerGrid * 2 + 2;
  const totalHeightOfGameScene = amountOfTiles * config.pixelSize;
  app.stage.scale = viewportHeight / totalHeightOfGameScene;
  app.resize();
}
