import { search, computePercentage, TICK_MS, Ping } from '@/common';
import { SpeedTracker, serializeMap } from './speed';
import { Icon, Color } from './icon';

import downloads = chrome.downloads;
import DownloadItem = downloads.DownloadItem;
import DownloadDelta = downloads.DownloadDelta;
import runtime = chrome.runtime;


/**
 * @note
 * Technically `setInterval` shouldn't be used in MV3 Chrome Extensions, since they run in service
 * workers and the interval might be cancelled at any time. The alternative is... unknown, at this
 * point in time, as far as I can tell.
 *
 * This isn't a very high-stakes extension, so I'll accept the consequences.
 */

class DownloadManager {

    private static _instance: DownloadManager | null = null;

    private speeds: Map<DownloadItem['id'], SpeedTracker>;
    private timer: ReturnType<typeof setInterval> | null;
    private icon: Icon;
    private port: runtime.Port | null;

    /**
     * Holds the downloads that have finished since the user most recently opened their popup.
     */
    private unchecked: DownloadItem[];


    private constructor() {
        this.speeds = new Map();
        this.timer = null;
        this.icon = new Icon();
        this.port = null;

        this.unchecked = [ ];

        downloads.setShelfEnabled(false);

        downloads.onCreated.addListener(this.onDownloadCreated.bind(this));
        downloads.onChanged.addListener(this.onDownloadChanged.bind(this));
        downloads.onErased.addListener(this.onDownloadErased.bind(this));

        runtime.onConnect.addListener(this.onConnect.bind(this));

        // Draw the icon once on startup
        this.icon.draw();
    }


    public static get Instance() {
        return (this._instance ||= new DownloadManager());
    }


    /**
     * Accepts an incoming connection from the popup so that it may be sent messages.
     * @param port The port opened by the popup
     */
    private onConnect(port: runtime.Port) {
        console.log("Popup connected to service worker.");

        this.port = port;
        this.port.onDisconnect.addListener(() => {
            console.log("Popup disconnected from service worker.");
            this.port = null;
        });

        // Clear the unchecked downloads and re-draw the icon
        this.unchecked = [ ];
        this.drawIcon();
    }


    /**
     * Pings the popup to refresh and starts the timer if either are necessary.
     */
    private onDownloadCreated() {
        this.port?.postMessage({ });
        this.start();
    }


    /**
     * Pings the popup to refresh, moves completed downloads into the `unchecked` buffer, and
     * redraws the icon.
     * @param delta The change from the Chrome API.
     */
    private async onDownloadChanged(delta: DownloadDelta) {
        // Trigger when the state of any downloads change
        if (delta.state !== undefined) {
            const error = delta.error;
            const state = delta.state.current;

            // Trigger when the download is either completed or interrupted, but not cancelled
            if ((state == 'interrupted' || state == 'complete') && error != 'USER_CANCELED') {
                const [ item ] = await search({ id: delta.id });

                if (item) {
                    // If the popup is not open, push to the unchecked list to make the icon green
                    if (this.port === null) {
                        this.unchecked.push(item);
                    }

                    // Stop tracking the speed of this item
                    this.speeds.delete(item.id);
                }
            }
        }

        // In all cases, draw the icon again
        await this.drawIcon();
    }


    /**
     * Pings the popup to refresh and redraws the icon.
     */
    private onDownloadErased() {
        this.port?.postMessage({ });
        this.drawIcon();
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

        console.log('Timer started');

        // Otherwise, start the timer
        this.timer = setInterval(this.tick.bind(this), TICK_MS);
        this.tick();
    }


    /**
     * Stops the timer.
     */
    private stop() {
        if (this.timer === null) return;

        console.log('Timer stopped');

        clearInterval(this.timer);
        this.timer = null;

        // Just in case a download managed to sneak through without getting deleted
        this.speeds.clear();

        // Drawing the icon after downloads complete is handled by the onDownloadChanged listener.
    }


    /**
    * Pings the popup to refresh and redraws the icon every `TICK_MS` milliseconds. Stops itself
    * when no more downloads are active.
    */
    private async tick() {
        const activeDownloads = await search({ state: 'in_progress' });

        if (activeDownloads.length > 0) {

            // Update our speeds
            for (const download of activeDownloads) {
                const bytes = download.bytesReceived;
                const tracker = this.speeds.get(download.id);

                if (tracker) {
                    tracker.pushSize(bytes);
                } else {
                    this.speeds.set(download.id, new SpeedTracker(bytes));
                }
            }

            // Send to the popup
            const message: Ping = { payload: serializeMap(this.speeds) };
            this.port?.postMessage(message);
            await this.drawIcon();
        } else {
            this.stop();
        }
    }


    /**
     * Draws the currently appropriate icon.
     */
    private async drawIcon() {
        const activeDownloads = await search({ state: 'in_progress' });

        // Determine the colour to draw
        const color = (() => {
            // First priority: check if any of the freshly completed items errored-out (excluding
            // those cancelled by the user).
            if (this.unchecked.some(d => d.state == 'interrupted' && !d.error?.startsWith('USER_')))
            return Color.Error;

            // Second: check if any of the currently active items are paused.
            if (activeDownloads.some(item => item.paused))
            return Color.Paused;

            // Third: check if any of the freshly completed items were successful.
            if (this.unchecked.some(c => c.state == 'complete'))
            return Color.Complete;

            // Otherwise, just use the normal color.
            return Color.Normal;
        })();

        // If anything is actually downloading at the moment, check the total percentage
        if (activeDownloads.length > 0) {
            // Get total completion percentage across all downloads
            const allDownloads = [ ...this.unchecked, ...activeDownloads ];

            // Compute the percentage of all unchecked and active downloads combined
            const { num, den } = allDownloads.reduce((acc, cur) => {
                // Handle edge-case where downloads sometimes (not sure how) end up without a
                // `bytesReceived` property
                if (!cur || !cur.bytesReceived || (!cur.bytesReceived && !cur.fileSize)) {
                    return acc;
                } else {
                    let { num, den } = computePercentage(cur);
                    acc.num += num;
                    acc.den += den;
                    return acc;
                }
            }, { num: 0, den: 0 });

            this.icon.draw(color, num / den);
        } else {
            // Just draw icon without a progress bar
            this.icon.draw(color);
        }
    }

}


// ====== Initialize ======

DownloadManager.Instance.start();
