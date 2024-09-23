import "./styles.css";
import { Application, Assets, Graphics, Point, Text } from "pixi.js";
import seedrandom from "seedrandom";
import maze1String from "./mazes/maze1.txt?raw";

const wallColor = 0x000000;
const levelColor = 0xffffff;
const pixelSize = 20;
const fontSize = 15;
const letters = "abcdefghijklmnopqrstuvwxyz";

let rng = seedrandom("1337");
const app = new Application();

Promise.all([
  Assets.load("JetBrainsMono/JetBrainsMono-Regular.woff2"),
  app.init({ resizeTo: window, backgroundColor: levelColor }),
]).then(() => {
  startApp();
});

function startApp() {
  document.getElementById("app")!.appendChild(app.canvas);

  // Developer tools integration
  // @ts-ignore
  globalThis.__PIXI_APP__ = app;

  function randomLetter() {
    return letters[Math.floor(rng() * letters.length)];
  }

  function loadMaze(maze: string) {
    const walls = [];
    const pathFields = [];
    const rows = maze.split("\n");
    for (let y = 0; y < rows.length; y++) {
      const row = rows[y];
      for (let x = 0; x < row.length; x++) {
        if (row[x] === " ") {
          pathFields.push([x, y]);
        } else {
          walls.push([x, y]);
        }
      }
    }
    return { walls, path: pathFields };
  }

  const maze = loadMaze(maze1String as string);

  for (const [x, y] of maze.walls) {
    const obj = new Graphics({ x: x * pixelSize, y: y * pixelSize })
      .rect(0, 0, pixelSize, pixelSize)
      .fill(wallColor);
    app.stage.addChild(obj);
  }

  new Point();
  const letterMap = new Map<string, string>();

  for (const [x, y] of maze.path) {
    let letter = randomLetter();
    const text = new Text({
      text: letter,
      style: {
        fontFamily: "Jetbrainsmono Regular",
        fontSize: fontSize,
      },
    });
    text.x = pixelSize / 2 - text.width / 2 + x * pixelSize;
    text.y = y * pixelSize;
    app.stage.addChild(text);

    letterMap.set(`${x}x${y}`, letter);
  }

  const player = new Graphics()
    .rect(pixelSize, 25 * pixelSize, pixelSize, pixelSize)
    .fill(0x777777);
  app.stage.addChild(player);
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
        player.y -= pixelSize;
        break;
      case Direction.Down:
        playerY += 1;
        player.y += pixelSize;
        break;
      case Direction.Left:
        playerX -= 1;
        player.x -= pixelSize;
        break;
      case Direction.Right:
        playerX += 1;
        player.x += pixelSize;
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
    const upLetter = letterMap.get(`${playerX}x${playerY - 1}`);
    const downLetter = letterMap.get(`${playerX}x${playerY + 1}`);
    const rightLetter = letterMap.get(`${playerX + 1}x${playerY}`);
    const leftLetter = letterMap.get(`${playerX - 1}x${playerY}`);

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
      moveByDirection(nextDirection);
      history.push(nextDirection);
      return;
    }

    if (event.key === "Backspace" && lastDirection !== Direction.None) {
      const revertedLastDirection = getOppositeDirection(lastDirection);
      moveByDirection(revertedLastDirection);
      history.pop();
    }
  });
}
