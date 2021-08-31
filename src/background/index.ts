import { search } from 'shared';
import { States } from './colors';
import { drawNormalIcon, drawProgressIcon } from './draw-icon';

// Disable the shelf while this extension is loaded
chrome.downloads.setShelfEnabled(false);

let interval: number | null = null;
let state = States.Normal;
let resetColor = false;

const refreshStatus = () => search({ state: 'in_progress' }).then(updateIcon);

/**
 * The handler to run during downloads that will check and see if an error
 * occurs.
 * @param change The change-event from the chrome listener.
 */
function waitForChange(change: chrome.downloads.DownloadDelta) {
  if (change.state?.current == 'interrupted') state = States.Error;
  else if (change.paused?.current) state = States.Paused;
  else if (!change.paused?.current) state = States.Normal;
}


/**
 * Stops the interval timer and stops listening for errors, then draws the final
 * arrow.
 */
function endProgress() {
  if (interval !== null) {
    clearInterval(interval);
    interval = null;

    chrome.downloads.onChanged.removeListener(waitForChange);

    // Now that we're done, anything that was not an error means success
    if (state != States.Error) state = States.Success;
  }

  drawNormalIcon(state);
  resetColor = true; // next time they open the popup, reset the color
}

function updateIcon(inProgress: chrome.downloads.DownloadItem[]) {
  // If there's anything currently downloading
  if (inProgress.length) {
    // Count total downloaded bytes and total bytes-to-download
    const [ downloaded, total ] = inProgress.reduce((acc, cur) => {
      acc[0] += cur.bytesReceived;
      acc[1] += cur.totalBytes;
      return acc;
    }, [ 0, 0 ]);

    drawProgressIcon(downloaded / total, state);

    // Start watching for updates
    if (interval === null) {
      state = States.Progress;
      // cast because of TS thinking we want @types/node's setInterval
      interval = setInterval(refreshStatus, 500) as unknown as number;
      chrome.downloads.onChanged.addListener(waitForChange);
    }
  }

  // If there's no running downloads
  else endProgress();
}

chrome.downloads.onCreated.addListener(refreshStatus);

chrome.runtime.onMessage.addListener(message => {
  if (resetColor && message == 'downloader_popup_opened') {
    drawNormalIcon(state = States.Normal);
  }
});

refreshStatus();