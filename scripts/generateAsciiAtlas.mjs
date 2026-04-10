import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** B&W map: dark = land, light = water (checked into scripts/) */
const IMAGE = path.join(__dirname, "world-landmask-ref.png");

const TARGET_W = 72;
const TARGET_H = 22;
const LAND = "░";
const SEA = "·";

function brightness(r, g, b) {
  return (r + g + b) / 3;
}

function main() {
  const buf = fs.readFileSync(IMAGE);
  const png = PNG.sync.read(buf);
  const rows = [];

  for (let ty = 0; ty < TARGET_H; ty++) {
    let line = "";
    const srcY0 = Math.floor((ty * png.height) / TARGET_H);
    const srcY1 = Math.ceil(((ty + 1) * png.height) / TARGET_H);
    for (let tx = 0; tx < TARGET_W; tx++) {
      const srcX0 = Math.floor((tx * png.width) / TARGET_W);
      const srcX1 = Math.ceil(((tx + 1) * png.width) / TARGET_W);
      let sum = 0;
      let n = 0;
      for (let y = srcY0; y < srcY1; y++) {
        for (let x = srcX0; x < srcX1; x++) {
          const i = (png.width * y + x) << 2;
          sum += brightness(png.data[i], png.data[i + 1], png.data[i + 2]);
          n++;
        }
      }
      const avg = sum / n;
      line += avg < 110 ? LAND : SEA;
    }
    rows.push(line);
  }

  console.log(`const W = ${TARGET_W};`);
  console.log("");
  console.log("const RAW = [");
  for (const row of rows) {
    console.log(`  "${row}",`);
  }
  console.log("];");
}

main();
