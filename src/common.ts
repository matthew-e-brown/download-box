import DownloadItem = chrome.downloads.DownloadItem;
import DownloadQuery = chrome.downloads.DownloadQuery;


export type DownloadSpeeds = {
    [key: DownloadItem['id']]: number,
}

export interface Ping {
    payload?: DownloadSpeeds;
}


// Size of a tick in milliseconds
export const TICK_MS = 500;
export const TICKS_PER_SECOND = 1000 / TICK_MS;


export function search(query: DownloadQuery) {
    return new Promise<DownloadItem[]>(resolve => {
        chrome.downloads.search(query, resolve);
    });
}


// https://stackoverflow.com/a/18650828/10549827
export function formatSize(bytes: number): string {
    if (bytes == -1) return '? B';
    if (bytes == 0) return '0 B';

    const k = 1000;
    const s = [ 'B', 'KB', 'MB', 'GB', 'TB' ];
    const i = Math.floor(Math.log10(bytes) / Math.log10(k));
    const p = i && 2; // 0 decimals if index is 0: no decimals for 'Bytes'

    return `${(bytes / Math.pow(k, i)).toFixed(p)} ${s[i]}`;
}


export function computePercentage(item: DownloadItem) {
    // Use `fileSize` as a fallback if `totalBytes` is unknown
    const { bytesReceived, totalBytes, fileSize } = item;
    return {
        num: bytesReceived,
        den: totalBytes > 0 ? totalBytes : fileSize
    };
}


/**
 * Gets the ISO 8601 date-string for a given item, plus one millisecond. Used for starting a page at
 * that given item. If nothing is passed, the current time's date-string is returned instead: used
 * for starting at the first page.
 *
 * @param item The item to get the date-string from.
 * @returns An 8601 date-string.
 *
 * @note The +1ms comes from the fact that we start pages by querying with the 'starts *before*'
 * parameter: if we pass the exact time, the desired item will be excluded.
 */
export function getItemStartTime(item?: DownloadItem) {
    // if they pass nothing just return the current time
    if (!item) return (new Date()).toISOString();
    // since it starts "before" the passed time, we add one millisecond to it
    return (new Date(new Date(item.startTime).getTime() + 1)).toISOString();
}
