export const generateRandomSeed = () => {
  const seed = [...Array(32)]
    .map(
      () =>
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"[
          Math.floor(Math.random() * 62)
        ],
    )
    .join("");

  console.log("seed: ", seed);
  return seed;
};
