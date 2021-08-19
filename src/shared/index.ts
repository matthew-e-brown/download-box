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