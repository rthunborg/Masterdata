import sharp from "sharp";
import { expect, it } from "vitest";

it("decodes, resizes and encodes an image with the patched native Sharp runtime", async () => {
  const png = await sharp({
    create: { width: 16, height: 12, channels: 4, background: { r: 20, g: 90, b: 180, alpha: 0.5 } },
  }).png().toBuffer();
  const webp = await sharp(png).resize({ width: 8 }).webp({ lossless: true }).toBuffer();
  const metadata = await sharp(webp).metadata();
  expect(metadata).toMatchObject({ format: "webp", width: 8, height: 6, hasAlpha: true });
  const { data, info } = await sharp(webp).raw().toBuffer({ resolveWithObject: true });
  expect(info.channels).toBe(4);
  expect(data.length).toBe(8 * 6 * 4);
  expect(data[3]).toBeGreaterThan(0);
  expect(data[3]).toBeLessThan(255);
});
