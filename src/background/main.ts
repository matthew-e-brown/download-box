import { search, computePercentage, Message } from '@/common';
import { drawIcon, drawProgressIcon, Color } from './draw';

import downloads = chrome.downloads;
import sendMessage = chrome.runtime.sendMessage;

function main() {

  let timer: ReturnType<typeof setInterval> | null = null;
  let color = Color.Normal;

  function start() {
    if (timer === null) {
      console.log('Starting timer');
      timer = setInterval(tick, 500);
    }
  }

  function stop() {
    if (timer !== null) {
      console.log('Stopping timer');
      clearInterval(timer);
      timer = null;
    }
  }

  function checkActive() {
    return search({ state: 'in_progress' });
  }

  async function tick() {
    const active = await checkActive();
    if (active.length > 0) {
      sendMessage(Message.ProgressTick);

      const percent = active.reduce((acc, cur) => {
        const { num, den } = computePercentage(cur);
        return acc + num / den;
      }, 0) / active.length;

      drawProgressIcon(percent, color);
    } else {
      stop();
      drawIcon(color);
    }
  }

  async function startIfActive() {
    const active = await checkActive();
    if (active.length > 0) start();
    else {
      stop();
      drawIcon(color);
    }
  }

  downloads.setShelfEnabled(false);

  downloads.onCreated.addListener(() => {
    sendMessage(Message.NewDownload);
    start();
  });

  downloads.onChanged.addListener(delta => {
    sendMessage(Message.Change);
    startIfActive();

    if (delta.state?.current == 'interrupted') {
      color = Color.Error;
    } else if (delta.state?.current == 'complete' && color != Color.Error) {
      color = Color.Complete;
    }
  });

  downloads.onErased.addListener(() => sendMessage(Message.Erased));

  chrome.runtime.onMessage.addListener((message: Message) => {
    if (message == Message.PopupOpened) drawIcon(color = Color.Normal);
  });

  startIfActive();
  drawIcon();
}

main();