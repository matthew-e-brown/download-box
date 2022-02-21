export enum Color {
  Normal    = 'hsl(0, 0%, 50%)',
  Paused    = 'hsl(60, 100%, 50%)',
  Error     = 'hsl(0, 75%, 50%)',
  Complete  = 'hsl(130, 64%, 50%)',
}


interface QueuedPromise {
  promiseRunner: () => Promise<void>,
  resolve: () => void,
  reject: (reason?: any) => void,
}


/**
 * We employ a Promise queue for drawing the icons to prevent flickering when
 * opening and closing the menu
 */
class PromiseQueue {

  private queue: QueuedPromise[];
  private waiting: boolean;


  public constructor() {
    this.queue = [];
    this.waiting = false;
  }


  public enqueue(promiseRunner: () => Promise<void>): Promise<void> {
    return new Promise((resolve, reject) => {
      // Only allow for at most 2 icon-drawings to be on the stack at a time
      if (this.queue.length >= 2) {
        console.log('Icon-drawing Promise queue size-limit reached');
        // Quietly resolve, completely forget about
        const popped = this.queue.shift();
        popped?.resolve();
      }

      this.queue.push({
        promiseRunner,
        resolve,
        reject,
      });

      // Attempt to immediately pop this promise off the stack
      this.dequeue();
    });
  }


  private dequeue(): void {
    // If another promise is running, don't run this one yet
    if (this.waiting) return;

    const item = this.queue.shift();
    // If there are no more promises, don't bother
    if (!item) return;

    // Run the current promise
    this.waiting = true;
    item.promiseRunner()
      .then(item.resolve)
      .catch(item.reject)
      .finally(() => {
        // Attempt to run the next one
        this.waiting = false;
        this.dequeue();
      });
  }

}


export class Icon {

  private canvas: OffscreenCanvas;
  private context: OffscreenCanvasRenderingContext2D;
  private queue: PromiseQueue;


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
    this.queue = new PromiseQueue();
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


  public async draw(): Promise<void>;
  public async draw(color: Color): Promise<void>;
  public async draw(color: Color, percentage: number): Promise<void>;

  public async draw(color: Color = Color.Normal, percentage?: number) {
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

    await this.queue.enqueue(() => this.setAsIcon());
  }

}