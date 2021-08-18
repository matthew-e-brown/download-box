export const searchDownloads = (query: chrome.downloads.DownloadQuery) => {
  return new Promise<chrome.downloads.DownloadItem[]>(resolve => {
    chrome.downloads.search(query, resolve);
  });
}

export const getFileIcon = (
  id: number,
  options?: chrome.downloads.GetFileIconOptions
) => {
  return new Promise<string>(resolve => {
    chrome.downloads.getFileIcon(id, options, resolve);
  });
}