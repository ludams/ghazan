import "./styles.css";
import { Application, Assets } from "pixi.js";
import { Config } from "./config.ts";
import { Game } from "./game.ts";
import maze1String from "./mazes/maze1.txt?raw";

const config: Config = {
  wallColor: 0x000000,
  pixelSize: 20,
  fontSize: 15,
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
  game.importMaze(maze1String as string);
  game.renderTiles();

  let playerX = 1;
  let playerY = 25;

  enum Direction {
    Up,
    Down,
    Left,
    Right,
    None,
  }

  let history: Direction[] = [Direction.None];

  function moveByDirection(direction: Direction) {
    switch (direction) {
      case Direction.Up:
        playerY -= 1;
        break;
      case Direction.Down:
        playerY += 1;
        break;
      case Direction.Left:
        playerX -= 1;
        break;
      case Direction.Right:
        playerX += 1;
        break;
      default:
        break;
    }
  }

  const getOppositeDirection = (direction: Direction) => {
    switch (direction) {
      case Direction.Up:
        return Direction.Down;
      case Direction.Down:
        return Direction.Up;
      case Direction.Left:
        return Direction.Right;
      case Direction.Right:
        return Direction.Left;
      default:
        return Direction.None;
    }
  };

  window.addEventListener("keydown", (event: KeyboardEvent) => {
    const upLetter = game.getTile(playerX, playerY - 1)?.letter;
    const downLetter = game.getTile(playerX, playerY + 1)?.letter;
    const rightLetter = game.getTile(playerX + 1, playerY)?.letter;
    const leftLetter = game.getTile(playerX - 1, playerY)?.letter;

    let lastDirection = history[history.length - 1];
    const surroundingLettersWithDirection = [
      [upLetter, Direction.Up],
      [downLetter, Direction.Down],
      [leftLetter, Direction.Left],
      [rightLetter, Direction.Right],
    ].filter(
      (directionByLetter): directionByLetter is [string, Direction] =>
        directionByLetter[0] !== undefined,
    );

    const nextDirectionsByLetterMap = new Map<string, Direction>(
      surroundingLettersWithDirection.filter(
        ([_, direction]) => lastDirection !== getOppositeDirection(direction),
      ),
    );

    const nextDirection = nextDirectionsByLetterMap.get(event.key);

    if (nextDirection !== undefined) {
      game.getTile(playerX, playerY)?.exit(app);
      moveByDirection(nextDirection);
      game.getTile(playerX, playerY)?.visit(app);
      history.push(nextDirection);
      return;
    }

    if (event.key === "Backspace" && lastDirection !== Direction.None) {
      const revertedLastDirection = getOppositeDirection(lastDirection);
      game.getTile(playerX, playerY)?.back(app);
      moveByDirection(revertedLastDirection);
      game.getTile(playerX, playerY)?.enter(app);
      history.pop();
    }
  });
}
