import { search, computePercentage, Message } from '@/common';
import { Icon, Color } from './draw';

import downloads = chrome.downloads;
import DownloadItem = downloads.DownloadItem;
import DownloadDelta = downloads.DownloadDelta;
import runtime = chrome.runtime;


class DownloadManager {

  private static _instance: DownloadManager | null = null;

  private timer: ReturnType<typeof setInterval> | null;
  private icon: Icon;

  /**
   * Holds the downloads that have finished since the user most recently opened
   * their popup.
   */
  private unchecked: DownloadItem[];


  private constructor() {
    this.timer = null;
    this.icon = new Icon();

    this.unchecked = [ ];

    downloads.setShelfEnabled(false);

    downloads.onCreated.addListener(this.onCreated.bind(this));
    downloads.onChanged.addListener(this.onChanged.bind(this));
    downloads.onErased.addListener(this.onErased.bind(this));

    runtime.onMessage.addListener(this.onMessage.bind(this));

    // Draw the icon once on startup
    this.icon.draw();
  }


  public static get Instance() {
    return (this._instance ||= new DownloadManager());
  }


  /**
   * Pings the popup to refresh and starts the timer if necessary.
   */
  private onCreated() {
    runtime.sendMessage(Message.Ping);
    this.start();
  }


  /**
   * Pings the popup to refresh, moves completed downloads into the `unchecked`
   * buffer, and redraws the icon.
   * @param delta The change from the Chrome API.
   */
  private async onChanged(delta: DownloadDelta) {
    runtime.sendMessage(Message.Ping);

    // If it was the state that changed...
    if (delta.state !== undefined) {
      const state = delta.state.current;
      // ...and the state completed, push to the list
      if (state == 'interrupted' || state == 'complete') {
        const [ item ] = await search({ id: delta.id });
        this.unchecked.push(item);
      }
    }

    await this.drawIcon();
  }


  /**
   * Redraws the icon with fresh colours.
   * @param message Message from the popup.
   */
  private onMessage(message: Message) {
    if (message == Message.PopupOpened) {
      // If they opened the popup, clear the unchecked downloads
      while (this.unchecked.length) this.unchecked.pop();
      this.drawIcon();
    }
  }


  /**
   * Pings the popup to refresh.
   */
  private onErased() {
    runtime.sendMessage(Message.Ping);
  }


  /**
   * Starts the timer if necessary.
   */
  public async start() {
    // Don't need to start the timer if it's already running
    if (this.timer !== null) return;

    // or if there are no active downloads
    const activeDownloads = await search({ state: 'in_progress' });
    if (activeDownloads.length <= 0) return;

    // Otherwise, start the timer
    this.timer = setInterval(this.tick.bind(this), 500);
    this.tick();
  }


  /**
   * Stops the timer.
   */
  private stop() {
    if (this.timer === null) return;

    clearInterval(this.timer);
    this.timer = null;

    // Drawing the icon after downloads complete is handled by the onChanged
    // listener.
  }


  /**
   * Pings the popup to refresh and redraws the icon every 500 milliseconds.
   * Stops itself when no more downloads are active.
   */
  private async tick() {
    const activeDownloads = await search({ state: 'in_progress' });

    if (activeDownloads.length > 0) {
      runtime.sendMessage(Message.Ping);
      this.drawIcon();
    } else {
      this.stop();
    }
  }


  /**
   * Draws the currently appropriate icon.
   */
  private async drawIcon() {
    const activeDownloads = await search({ state: 'in_progress' });

    // Check if anything is actually downloading at the moment
    if (activeDownloads.length > 0) {
      // Get total completion percentage across all downloads
      const allDownloads = [ ...this.unchecked, ...activeDownloads ];

      const { num, den } = allDownloads.reduce((acc, cur) => {
        // Handle edge-case where downloads sometimes (not sure how) end up
        // without a `bytesReceived` property
        if (!cur || !cur.bytesReceived || (!cur.bytesReceived && !cur.fileSize)) {
          return acc;
        } else {
          let { num, den } = computePercentage(cur);
          num += acc.num;
          den += acc.den;
          return { num, den };
        }
      }, { num: 0, den: 0 });

      // Start by determining the colour to draw
      const color = (() => {
        // First priority: check if any of the freshly completed items errored:
        if (this.unchecked.some(d => d.state == 'interrupted')) return Color.Error;

        // Second: check if any of the currently active items are paused:
        if (activeDownloads.some(item => item.paused)) return Color.Paused;

        // Third: check if any of the freshly completed items were successful:
        if (this.unchecked.some(c => c.state == 'complete')) return Color.Complete;

        // Otherwise, just use the normal color
        return Color.Normal;
      })();

      await this.icon.draw(num / den, color);
    } else {

      // Just draw the regular icon
      await this.icon.draw();
    }
  }

}


// ====== Initialize ======

DownloadManager.Instance.start();