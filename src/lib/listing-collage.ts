import sharp from "sharp";

const CELL_WIDTH = 300;
const CELL_HEIGHT = 400;
const GAP = 12;
const PADDING = 16;
const CORNER_RADIUS = 18;
const BACKGROUND = { r: 17, g: 17, b: 20, alpha: 1 };
const FETCH_TIMEOUT_MS = 10_000;

function columnsFor(count: number) {
  if (count <= 2) return count;
  if (count <= 6) return 3;
  return 4;
}

function roundedMask() {
  return Buffer.from(
    `<svg width="${CELL_WIDTH}" height="${CELL_HEIGHT}">
      <rect width="${CELL_WIDTH}" height="${CELL_HEIGHT}" rx="${CORNER_RADIUS}" ry="${CORNER_RADIUS}" fill="#fff"/>
    </svg>`
  );
}

async function renderCard(url: string, mask: Buffer) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`image ${response.status}: ${url}`);

  return sharp(Buffer.from(await response.arrayBuffer()))
    .resize(CELL_WIDTH, CELL_HEIGHT, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();
}

export async function buildListingCollage(imageUrls: string[]) {
  if (imageUrls.length === 0) return null;

  const mask = roundedMask();
  const cards = await Promise.all(imageUrls.map((url) => renderCard(url, mask)));

  const columns = columnsFor(cards.length);
  const rows = Math.ceil(cards.length / columns);
  const width = PADDING * 2 + columns * CELL_WIDTH + (columns - 1) * GAP;
  const height = PADDING * 2 + rows * CELL_HEIGHT + (rows - 1) * GAP;

  const composites = cards.map((input, index) => {
    const row = Math.floor(index / columns);
    const column = index % columns;
    const inRow = Math.min(cards.length - row * columns, columns);
    const rowWidth = inRow * CELL_WIDTH + (inRow - 1) * GAP;

    return {
      input,
      left: Math.round((width - rowWidth) / 2 + column * (CELL_WIDTH + GAP)),
      top: PADDING + row * (CELL_HEIGHT + GAP),
    };
  });

  return sharp({
    create: { width, height, channels: 4, background: BACKGROUND },
  })
    .composite(composites)
    .jpeg({ quality: 88 })
    .toBuffer();
}
