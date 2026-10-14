export interface CardImageSource {
  additionalAssets?: unknown;
  emotionImages?: unknown;
  additionalAssetManifest?: unknown;
}

export interface CardImageCatalog {
  assets: string[];
  emotions: string[];
  imageCount: number;
  unavailable: boolean;
}

const IMAGE_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "webp",
  "gif",
  "avif",
  "apng",
  "bmp",
  "svg",
  "tif",
  "tiff",
  "ico",
  "jxl",
]);
const OTHER_EXTENSIONS = new Set([
  "mp3",
  "wav",
  "ogg",
  "m4a",
  "aac",
  "flac",
  "opus",
  "wma",
  "mp4",
  "webm",
  "avi",
  "m4p",
  "m4v",
  "mov",
  "mkv",
  "pdf",
  "txt",
  "md",
  "json",
  "zip",
  "html",
  "js",
  "css",
]);

function extension(value: string): string {
  const clean = value.split(/[?#]/, 1)[0]!.toLowerCase();
  return clean.match(/\.([a-z0-9]+)$/)?.[1] ?? "";
}

/** Read asset keys, never stored file paths or binary image contents. */
export function collectCardImages(card: CardImageSource | null): CardImageCatalog {
  const catalog: CardImageCatalog = {
    assets: [],
    emotions: [],
    imageCount: 0,
    unavailable: !!card?.additionalAssetManifest && !Array.isArray(card.additionalAssets),
  };
  const read = (source: unknown, target: string[], emotions: boolean) => {
    if (!Array.isArray(source)) return;
    const seen = new Set<string>();
    for (const tuple of source) {
      if (
        !Array.isArray(tuple) ||
        typeof tuple[0] !== "string" ||
        !tuple[0].trim() ||
        typeof tuple[1] !== "string" ||
        !tuple[1]
      )
        continue;
      const [name, path, type] = tuple as [string, string, unknown];
      const declaredType = typeof type === "string" ? type.trim() : "";
      const fileType = declaredType
        ? extension(declaredType) || declaredType.toLowerCase().replace(/^\./, "")
        : extension(path) || extension(name);
      // Older cards may omit file types; PocketRisu treats those assets as images.
      if (
        !emotions &&
        (declaredType ? !IMAGE_EXTENSIONS.has(fileType) : OTHER_EXTENSIONS.has(fileType))
      )
        continue;
      catalog.imageCount += 1;
      const key = name.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        target.push(name);
      }
    }
  };
  read(card?.additionalAssets, catalog.assets, false);
  read(card?.emotionImages, catalog.emotions, true);
  return catalog;
}

export function cardImageKeywordCount(catalog: CardImageCatalog): number {
  return catalog.assets.length + catalog.emotions.length;
}

export function cardImagePrompt(catalog?: CardImageCatalog): string | undefined {
  if (!catalog || catalog.unavailable || cardImageKeywordCount(catalog) === 0) return undefined;
  return [
    "Available card image keywords. Use exact keys with the image syntax supported by card/lore.",
    ...(catalog.assets.length ? [`Assets: ${JSON.stringify(catalog.assets)}`] : []),
    ...(catalog.emotions.length ? [`Emotion images: ${JSON.stringify(catalog.emotions)}`] : []),
  ].join("\n");
}
