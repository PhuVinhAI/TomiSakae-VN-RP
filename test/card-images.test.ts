import { describe, expect, it } from "vitest";
import {
  cardImageKeywordCount,
  cardImagePrompt,
  collectCardImages,
} from "../risuai/tomisakae-vn-rp-plugin/src/card-images.js";

describe("Card image keywords", () => {
  it("keeps exact keys, counts images, groups duplicate keys and excludes other media", () => {
    const card = {
      additionalAssets: [
        ["maid.smile.1.png", "assets/a.png", "png"],
        ["maid.smile.2.png", "assets/b.webp", "webp"],
        ["maid.smile.1.png", "assets/c.png", "png"],
        ["MAID.SMILE.1.PNG", "assets/d.png", "png"],
        ["outfit.casual", "assets/e.png", "png"],
        ["wave.gif", "assets/f.gif"],
        ["legacy", "opaque-path"],
        ["legacy.pose.2", "opaque-path-2"],
        ["theme.mp3", "assets/g.mp3", "mp3"],
        ["movie", "assets/h.mp4"],
        ["doc.txt", "assets/i.txt"],
        ["broken", ""],
        ["", "assets/j.png", "png"],
        null,
      ],
      emotionImages: [
        ["happy", "assets/k.png"],
        ["sad", "assets/l.png"],
      ],
    };
    const snapshot = structuredClone(card);
    const catalog = collectCardImages(card);
    expect(catalog).toEqual({
      assets: [
        "maid.smile.1.png",
        "maid.smile.2.png",
        "outfit.casual",
        "wave.gif",
        "legacy",
        "legacy.pose.2",
      ],
      emotions: ["happy", "sad"],
      imageCount: 10,
      unavailable: false,
    });
    expect(cardImageKeywordCount(catalog)).toBe(8);
    const prompt = cardImagePrompt(catalog)!;
    expect(JSON.parse(prompt.split("\n")[1]!.slice("Assets: ".length))).toEqual(catalog.assets);
    expect(prompt).not.toMatch(/assets\/|theme\.mp3|movie|doc\.txt/);
    expect(card).toEqual(snapshot);
  });

  it("does not invent keywords when the card is empty or its manifest has not loaded", () => {
    expect(cardImagePrompt(collectCardImages(null))).toBeUndefined();
    const unavailable = collectCardImages({
      additionalAssetManifest: { id: "unavailable", count: 200 },
      emotionImages: [["happy", "assets/happy.png"]],
    });
    expect(unavailable.unavailable).toBe(true);
    expect(cardImagePrompt(unavailable)).toBeUndefined();
    const loaded = collectCardImages({
      additionalAssetManifest: { id: "available", count: 1 },
      additionalAssets: [["happy.png", "assets/happy.png", "png"]],
    });
    expect(loaded.unavailable).toBe(false);
    expect(cardImagePrompt(loaded)).toContain('Assets: ["happy.png"]');
  });

  it("serializes names without treating punctuation or macro text as executable syntax", () => {
    const name = 'scene."quote"\n{{char}}.png';
    const catalog = collectCardImages({ additionalAssets: [[name, "assets/image.png", "png"]] });
    const prompt = cardImagePrompt(catalog)!;
    expect(prompt.split("\n")).toHaveLength(2);
    expect(JSON.parse(prompt.split("\n")[1]!.slice("Assets: ".length))).toEqual([name]);
  });
});
