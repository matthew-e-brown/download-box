import { search, startInterval } from 'shared';
import { drawNormalIcon, drawProgressIcon, States } from './draw-icon';

// Disable the shelf while this extension is loaded
chrome.downloads.setShelfEnabled(false);

let state = States.Normal;
let stopTimer: (() => void) | null = null;
let resetColor = false;


/**
 * Re-searches Chrome downloads to get new properties on items and redraw the
 * icon
 */
async function refreshStatus() {
  const newItems = await search({ state: 'in_progress' });
  updateIcon(newItems);
}


/**
 * Stops the interval timer and stops listening for errors, then draws the final
 * arrow.
 */
function endProgress() {
  // If we are stopping a running timer instead of just running this function
  if (stopTimer) {
    stopTimer();
    stopTimer = null;

    // Now that we're done, anything that was not an error means success
    if (state != States.Error) state = States.Success;

    // next time they open the popup, reset the color
    resetColor = true;
  }

  drawNormalIcon(state);
}


/**
 * Updates the current icon either by nudging the progress bar along or checking
 * if the downloads are complete.
 * @param inProgress The list of currently in-progress download items from
 * Chrome
 */
function updateIcon(inProgress: chrome.downloads.DownloadItem[]) {
  // If there's anything currently downloading
  if (inProgress.length) {
    // Count total downloaded bytes and total bytes-to-download
    const [ downloaded, total ] = inProgress.reduce((acc, cur) => {
      acc[0] += cur.bytesReceived;
      acc[1] += cur.totalBytes;
      return acc;
    }, [ 0, 0 ]);

    // Check if any are paused, if they are the arrow is yellow (if not already
    // in error-state)
    if (inProgress.some(item => item.paused) && state != States.Error) {
      state = States.Paused;
    }

    // Start watching for updates if we haven't already
    if (!stopTimer) {
      state = States.Progress;
      stopTimer = startInterval(500, refreshStatus, () => state = States.Error);
    }

    drawProgressIcon(downloaded / total, state);
  }

  // If there's no running downloads
  else endProgress();
}

chrome.downloads.onCreated.addListener(refreshStatus);

chrome.runtime.onMessage.addListener(message => {
  if (message == 'downloader_popup_opened' && resetColor) {
    drawNormalIcon(state = States.Normal);
  }
});

refreshStatus();