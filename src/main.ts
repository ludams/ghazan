import { Application } from "pixi.js";

const app = new Application();
await app.init({ width: 640, height: 360 });

document.getElementById("app")!.appendChild(app.canvas);


