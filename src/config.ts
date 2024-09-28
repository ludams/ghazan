// const wallColor = 0x000000;
// const levelColor = 0xffffff;
// const pixelSize = 20;
// const fontSize = 15;
export type Config = {
  baseSeed: string;
  wallColor: number;
  pixelSize: number;
  fontSize: number;

  minGameTilePaddingLeft: number;
  maxGameTilePaddingLeft: number;
  springForce: number;
  lavaStartOffset: number;

  chunkCellsPerGrid: number;
  deadEndWallBreakRatio: number;
  chunkConnectingWallBreakRatio: number;
  chunkGenerationDistance: number;

  crossingsToPreFillWithWords: number;
  maxWordLengthToChooseInExactLengthMatchCase: number;

  inputElement: HTMLInputElement;
};
