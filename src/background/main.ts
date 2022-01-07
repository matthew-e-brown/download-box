import { search, Message } from '@/common';

import downloads = chrome.downloads;
import sendMessage = chrome.runtime.sendMessage;

function main() {

  let timer: ReturnType<typeof setInterval> | null = null;

  function start() {
    sendMessage(Message.NewDownload);
    if (timer === null) setInterval(tick, 500);
  }

  function stop() {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  }

  async function tick() {
    const inProgress = await search({ state: 'in_progress' });

    if (inProgress.length > 0) {
      sendMessage(Message.ProgressTick);
      // TODO: draw the toolbar icon
    } else {
      stop();
    }
  }

  downloads.setShelfEnabled(false);
  downloads.onCreated.addListener(start);
  downloads.onChanged.addListener(() => sendMessage(Message.Change));
  downloads.onErased.addListener(() => sendMessage(Message.Erased));
}

main();