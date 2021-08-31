import { getColor, States } from './colors';

const FS = 160;           // Full Size (w and h) of the icon sprite
const BH = FS / 5;        // Bar Height, drawn when downloading
const BS = 15;            // Bar Spacing, the distance between arrow and bar
const AS = FS - BH - BS;  // Arrow Size, since arrow must shrink when bar shown

const canvas = new OffscreenCanvas(FS, FS);
const context = canvas.getContext('2d');

/**
 * Draws an arrow onto a 2D Path
 * @param x x position
 * @param y y position
 * @param w width
 * @param h height
 */
function drawArrow(x: number, y: number, w: number, h: number): Path2D {
  const normalized = [
    { x: 0.285, y: 0.000 },   // top left of arrow's "box"
    { x: 0.285, y: 0.500 },   // left "nook"
    { x: 0.000, y: 0.500 },   // outer left edge
    { x: 0.500, y: 1.000 },   // bottom tip
    { x: 1.000, y: 0.500 },   // outer right edge
    { x: 0.725, y: 0.500 },   // right "nook"
    { x: 0.725, y: 0.000 },   // top right of the arrow's "box"
  ];

  const points = normalized.map(({ x: px, y: py }) => ({
    x: px * w + x,
    y: py * h + y,
  }));

  const path = new Path2D();
  const start = points.shift();

  path.moveTo(start.x, start.y);
  for (const point of points) path.lineTo(point.x, point.y);
  path.closePath();

  return path;
}

export function drawNormalIcon(state: States): void {
  context.clearRect(0, 0, FS, FS);
  context.fillStyle = getColor(state);
  context.fill(drawArrow(0, 0, FS, FS));

  setAsIcon();
}

export function drawProgressIcon(percent: number, state: States): void {
  context.clearRect(0, 0, FS, FS);

  const xShift = (1 - AS / FS) / 2 * FS;

  context.fillStyle = getColor(state);
  context.fill(drawArrow(xShift, 0, AS, AS));

  // always draw the loading bar's BG as normal colour
  context.fillStyle = getColor(States.Normal);
  context.fillRect(0, AS + BS, FS, BS);

  // always draw the loading bar's colour as progress
  context.fillStyle = getColor(States.Progress);
  context.fillRect(0, AS + BS, FS * percent, BH);

  setAsIcon();
}

function setAsIcon() {
  const imageData = context.getImageData(0, 0, FS, FS);
  chrome.action.setIcon({ imageData });
}