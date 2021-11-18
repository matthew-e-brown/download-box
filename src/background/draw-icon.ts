/**
 * The different states that can cause the colour of the icon to change
 */
export const enum States { Normal, Progress, Paused, Success, Error, };

const colors = new Map<States, string>([
  [ States.Normal,    '#5e5e5e' ],
  [ States.Progress,  '#2566ff' ],
  [ States.Paused,    '#ffff22' ],
  [ States.Success,   '#0bbf29' ],
  [ States.Error,     '#ff2222' ],
]);

const ICON_SIZE   =  160;                                   // Full Size (w and h) of the icon sprite
const BAR_HEIGHT  =  ICON_SIZE / 5;                         // Bar Height, drawn when downloading
const BAR_SPACE   =  BAR_HEIGHT / 2;                        // Bar Spacing, the distance between arrow and bar
const ARROW_SIZE  =  ICON_SIZE - BAR_HEIGHT - BAR_SPACE;    // Arrow Size, since arrow must shrink when bar shown

const canvas = new OffscreenCanvas(ICON_SIZE, ICON_SIZE);
const context = canvas.getContext('2d')!; // '!', we are passing known valid context type

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
  const start = points.shift()!; // '!', we just created the array ourselves

  path.moveTo(start.x, start.y);

  for (const point of points)
    path.lineTo(point.x, point.y);

  path.closePath();

  return path;
}

export function drawNormalIcon(state: States): void {
  context.clearRect(0, 0, ICON_SIZE, ICON_SIZE);
  context.fillStyle = colors.get(state) ?? colors.get(States.Normal)!;
  context.fill(drawArrow(0, 0, ICON_SIZE, ICON_SIZE));

  setAsIcon();
}

export function drawProgressIcon(percent: number, state: States): void {
  const mainColor = colors.get(States.Normal)!;
  const accentColor = colors.get(state) ?? colors.get(States.Progress)!;

  context.clearRect(0, 0, ICON_SIZE, ICON_SIZE);

  const xShift = (1 - ARROW_SIZE / ICON_SIZE) / 2 * ICON_SIZE;

  context.fillStyle = mainColor;
  context.fill(drawArrow(xShift, 0, ARROW_SIZE, ARROW_SIZE));

  // always draw the loading bar's BG as normal colour
  context.fillStyle = mainColor;
  context.fillRect(0, ARROW_SIZE + BAR_SPACE, ICON_SIZE, BAR_HEIGHT);

  context.fillStyle = accentColor;
  context.fillRect(0, ARROW_SIZE + BAR_SPACE, ICON_SIZE * percent, BAR_HEIGHT);

  setAsIcon();
}

function setAsIcon() {
  const imageData = context.getImageData(0, 0, ICON_SIZE, ICON_SIZE);
  chrome.action.setIcon({ imageData });
}