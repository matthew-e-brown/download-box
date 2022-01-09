import { getActive, completions, Result } from './main';
import { computePercentage } from '@/common';

import DownloadItem = chrome.downloads.DownloadItem;

const enum Color {
  Normal    = 'hsl(0, 0%, 50%)',
  Paused    = 'hsl(60, 100%, 50%)',
  Error     = 'hsl(0, 75%, 50%)',
  Complete  = 'hsl(130, 64%, 50%)',
}

const normalizedPoints = [
  { x: 0.285, y: 0.000 },   // top left of arrow's "box"
  { x: 0.285, y: 0.500 },   // left "nook"
  { x: 0.000, y: 0.500 },   // outer left edge
  { x: 0.500, y: 1.000 },   // bottom tip
  { x: 1.000, y: 0.500 },   // outer right edge
  { x: 0.725, y: 0.500 },   // right "nook"
  { x: 0.725, y: 0.000 },   // top right of the arrow's "box"
];

const canvas = new OffscreenCanvas(160, 160);
const context = canvas.getContext('2d')!;


function setContextAsIcon() {
  const imageData = context.getImageData(0, 0, 160, 160);
  return new Promise<void>(r => chrome.action.setIcon({ imageData }, r));
}


function drawArrow(x: number, y: number, w: number, h: number): Path2D {

  const points = normalizedPoints.map(({ x: nx, y: ny }) => ({
    x: nx * w + x,
    y: ny * h + y,
  }));

  const path = new Path2D();
  const start = points.shift()!;

  path.moveTo(start.x, start.y);

  for (const point of points) path.lineTo(point.x, point.y);

  path.closePath();

  return path;
}


function determineMainColor(active?: DownloadItem[]) {
  // First priority: check if any of the freshly completed items errored:
  if (completions.some(c => c == Result.Err)) return Color.Error;

  // Second: check if any of the currently active items are paused:
  if (active?.some(item => item.paused)) return Color.Paused;

  // Third: check if any of the freshly completed items were successful:
  if (completions.some(c => c == Result.Ok)) return Color.Complete;

  // Otherwise, just use the normal color:
  return Color.Normal;
}


export async function drawIcon() {
  context.clearRect(0, 0, 160, 160);

  const active = await getActive();
  if (active.length) {

    const percent = active.reduce((acc, cur) => {
      const { num, den } = computePercentage(cur);
      return acc + num / den;
    }, 0) / active.length;

    // 112 out of 160 -> 24 on each side
    const path = drawArrow(24, 0, 112, 112);

    context.fillStyle = determineMainColor(active);
    context.fill(path);

    // 48 pixels below arrow for bar, use a space of 12 and draw 36 tall
    context.fillStyle = Color.Normal;
    context.fillRect(0, 112 + 12, 160, 36);

    context.fillStyle = 'hsl(201, 100%, 50%)';
    context.fillRect(0, 112 + 12, 160 * percent, 36);

  } else {
    const path = drawArrow(0, 0, 160, 160);
  
    context.fillStyle = determineMainColor();
    context.fill(path);
  }

  await setContextAsIcon();
}