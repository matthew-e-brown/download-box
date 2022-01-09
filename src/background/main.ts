import { search, Message } from '@/common';
import { drawIcon } from './draw';

import downloads = chrome.downloads;
import sendMessage = chrome.runtime.sendMessage;

export const getActive = () => search({ state: 'in_progress' });
export const completions: Result[] = [ ];

export const enum Result {
  Ok,
  Err,
}


// ====== Timer functions ======

let timer: ReturnType<typeof setInterval> | null = null;


function start() {
  if (timer === null) {
    console.log('Starting timer');
    tick();
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

async function tick() {
  const active = await getActive();
  if (active.length > 0) {
    sendMessage(Message.ProgressTick);
    drawIcon();
  } else stop();
}

async function startIfActive() {
  const active = await getActive();
  if (active.length > 0) start();
  else stop();
}


// ====== Set up Chrome listeners ======

downloads.setShelfEnabled(false);

downloads.onCreated.addListener(() => {
  sendMessage(Message.NewDownload);
  startIfActive();
});

downloads.onChanged.addListener(delta => {
  sendMessage(Message.Change);

  // If the state is what changed:
  if (delta.state !== undefined) {
    if (delta.state.current == 'interrupted') completions.push(Result.Err);
    else if (delta.state.current == 'complete') completions.push(Result.Ok);
  }

  drawIcon();
  startIfActive();
});

downloads.onErased.addListener(() => sendMessage(Message.Erased));

chrome.runtime.onMessage.addListener((message: Message) => {
  if (message == Message.PopupOpened) {
    // Remove all completions and re-draw icon
    while (completions.length) completions.pop();
    drawIcon();
  }
});


// ====== Initialize ======

startIfActive();
drawIcon();