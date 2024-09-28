import { Application } from "pixi.js";

type VisualViewPortListener = (width: number, height: number) => void;

export class VisualViewportListener {
  private readonly app: Application;
  private readonly resizeListeners: VisualViewPortListener[] = [];

  constructor(app: Application) {
    this.app = app;
  }

  public get currentViewportDimensions(): { width: number; height: number } {
    return {
      width: window.visualViewport?.width ?? window.innerWidth,
      height: window.visualViewport?.height ?? window.innerHeight,
    };
  }

  init() {
    this.addListenersForViewportChanges();
    this.resizeListeners.push((width, height) =>
      this.setViewportCssVars(width, height),
    );
  }

  public notifyListenersOfCurrentViewportDimensions() {
    this.notifyListenersOfViewportDimensions(
      this.currentViewportDimensions.width,
      this.currentViewportDimensions.height,
    );
  }

  public notifyListenersOfViewportDimensions(width: number, height: number) {
    this.resizeListeners.forEach((next) => {
      next(width, height);
    });
    this.app.resize();
  }

  public subscribeToViewportChanges(listener: VisualViewPortListener) {
    this.resizeListeners.push(listener);
  }

  private addListenersForViewportChanges() {
    if (!window.visualViewport) {
      window.addEventListener("resize", () => {
        this.notifyListenersOfViewportDimensions(
          window.innerWidth,
          window.innerHeight,
        );
      });
      return;
    }

    window.visualViewport.addEventListener("resize", (event) => {
      const currentViewPort = event.currentTarget as VisualViewport;
      this.notifyListenersOfViewportDimensions(
        currentViewPort.width,
        currentViewPort.height,
      );
    });
  }

  private setViewportCssVars(viewWidth: number, viewHeight: number) {
    const vw = viewWidth * 0.01;
    const vh = viewHeight * 0.01;
    document.documentElement.style.setProperty("--vw", `${vw}px`);
    document.documentElement.style.setProperty("--vh", `${vh}px`);
  }
}
