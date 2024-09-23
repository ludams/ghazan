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

  window.addEventListener("keydown", (event: KeyboardEvent) => {
    var upLetter = letterMap.get(`${playerX}x${playerY - 1}`);
    var downLetter = letterMap.get(`${playerX}x${playerY + 1}`);
    var rightLetter = letterMap.get(`${playerX + 1}x${playerY}`);
    var leftLetter = letterMap.get(`${playerX - 1}x${playerY}`);

    if (upLetter && upLetter === event.key) {
      playerY -= 1;
      player.y -= pixelSize;
    } else if (downLetter && downLetter === event.key) {
      playerY += 1;
      player.y += pixelSize;
    } else if (leftLetter && leftLetter === event.key) {
      playerX -= 1;
      player.x -= pixelSize;
    } else if (rightLetter && rightLetter === event.key) {
      playerX += 1;
      player.x += pixelSize;
    }
  });
}
