let isDarkMode = false;
chrome.runtime.onMessage.addListener(message => {
  if (message.scheme == 'dark') isDarkMode = true;
  else isDarkMode = false;
});

const NS = 256;           // Normal Size (w and h) of the icon sprite
const BH = NS / 5;        // Bar Height, drawn when downloading
const BS = 12;            // Bar Spacing, the distance between arrow and bar
const AS = NS - BH - BS;  // Arrow Size, since arrow must shrink when bar shown

export enum States { Normal, Paused, Success, Error, };

export const drawNormalIcon = (state = States.Normal) => {

}

export const drawProgressIcon = (percent: number, state = States.Normal) => {

}