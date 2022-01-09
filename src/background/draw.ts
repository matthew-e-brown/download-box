export const enum Color {
  Normal = 'hsl(0, 0%, 50%)',
  Paused = 'hsl(60, 100%, 50%)',
  Error = 'hsl(0, 75%, 50%)',
  Complete = 'hsl(130, 64%, 50%)',
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

function setContextAsIcon() {
  const imageData = context.getImageData(0, 0, 160, 160);
  chrome.action.setIcon({ imageData });
}


export function drawIcon(color = Color.Normal): void {
  context.clearRect(0, 0, 160, 160);

  const path = drawArrow(0, 0, 160, 160);

  context.fillStyle = color;
  context.fill(path);

  setContextAsIcon();
}


export function drawProgressIcon(percent: number, color = Color.Normal): void {
  context.clearRect(0, 0, 160, 160);

  // 112 out of 160 -> 24 on each side
  const path = drawArrow(24, 0, 112, 112);

  context.fillStyle = color;
  context.fill(path);

  // 48 pixels below arrow for bar, use a space of 12 and draw 36 tall
  context.fillStyle = Color.Normal;
  context.fillRect(0, 112 + 12, 160, 36);

  context.fillStyle = 'hsl(201, 100%, 50%)';
  context.fillRect(0, 112 + 12, 160 * percent, 36);

  setContextAsIcon();
}