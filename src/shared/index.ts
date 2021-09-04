/**
 * Code used in multiple places all over the extension.
 */


/**
 * Wrapper for chrome.i18n.getMessage a) for brevity and b) to stop Svelte in VS
 * Code to stop whining
 */
export const bodyText = chrome.i18n.getMessage;


/**
 * Wrapper for chrome.downloads.search that uses a Promise instead of a
 * callback.
 * @param query Downloads to search for
 * @returns The resulting downloads
 */
export const search = (query: chrome.downloads.DownloadQuery) => {
  return new Promise<chrome.downloads.DownloadItem[]>(resolve => {
    chrome.downloads.search(query, resolve);
  });
}


/**
 * Starts a timer and a listener on chrome.downloads.onChanged.
 * @param ms How long to wait between each interval.
 * @param onUpdate The function to run every 'ms'.
 * @param onInterrupted The function to run if an 'interrupted' state appears.
 * @returns A function to end the timer.
 */
export function startInterval(
  ms: number,
  onUpdate: () => void,
  onInterrupted?: (downloadDelta: chrome.downloads.DownloadDelta) => void,
): () => void {
  // cast because of TS thinking we want @types/node's setInterval
  let timerID = setInterval(onUpdate, ms) as unknown as number;

  const listener = (delta: chrome.downloads.DownloadDelta) => {
    if (!!onInterrupted && delta.state?.current == 'interrupted')
      onInterrupted(delta);
    else if (!onInterrupted)
      onUpdate();
  }

  chrome.downloads.onChanged.addListener(listener);

  return () => {
    clearInterval(timerID);
    chrome.downloads.onChanged.removeListener(listener);
  }
}