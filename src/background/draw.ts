export enum Color {
  Normal    = 'hsl(0, 0%, 50%)',
  Paused    = 'hsl(60, 100%, 50%)',
  Error     = 'hsl(0, 75%, 50%)',
  Complete  = 'hsl(130, 64%, 50%)',
}

export class Icon {

  private canvas: OffscreenCanvas;
  private context: OffscreenCanvasRenderingContext2D;

  /**
   * Defines the shape of the arrow graph using points normalized between zero
   * one.
   */
  private static normalizedPoints = [
    { x: 0.285, y: 0.000 },   // top left of arrow's "box"
    { x: 0.285, y: 0.500 },   // left "nook"
    { x: 0.000, y: 0.500 },   // outer left edge
    { x: 0.500, y: 1.000 },   // bottom tip
    { x: 1.000, y: 0.500 },   // outer right edge
    { x: 0.725, y: 0.500 },   // right "nook"
    { x: 0.725, y: 0.000 },   // top right of the arrow's "box"
  ];


  public constructor() {
    this.canvas = new OffscreenCanvas(160, 160);
    this.context = this.canvas.getContext('2d')!;
  }


  private setAsIcon() {
    const imageData = this.context.getImageData(0, 0, 160, 160);
    return new Promise<void>(r => chrome.action.setIcon({ imageData }, r));
  }


  private createArrow(x: number, y: number, w: number, h: number): Path2D {
    const points = Icon.normalizedPoints.map(({ x: nx, y: ny }) => ({
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


  public async draw(percentage?: number, color: Color = Color.Normal) {
    this.context.clearRect(0, 0, 160, 160);

    if (percentage) {
      // 112 out of 160 -> 24 on each side
      const path = this.createArrow(24, 0, 112, 112);

      this.context.fillStyle = color;
      this.context.fill(path);

      // 48 pixels below arrow for bar, use a space of 12 and draw 36 tall
      this.context.fillStyle = Color.Normal;
      this.context.fillRect(0, 112 + 12, 160, 36);

      this.context.fillStyle = 'hsl(201, 100%, 50%)';
      this.context.fillRect(0, 112 + 12, 160 * percentage, 36);

    } else {
      const path = this.createArrow(0, 0, 160, 160);

      this.context.fillStyle = color;
      this.context.fill(path);
    }

    await this.setAsIcon();
  }

}