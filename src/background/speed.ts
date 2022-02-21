import { DownloadSpeeds, TICKS_PER_SECOND } from '@/common';

import DownloadItem = chrome.downloads.DownloadItem;


interface RecentAmount {
  time: Date,
  size: number,
}


export class SpeedTracker {

  private speeds: number[];
  private mostRecent: RecentAmount;


  public constructor(startingSize: number = 0) {
    this.speeds = [ ];
    this.mostRecent = {
      size: startingSize,
      time: new Date(),
    };
  }


  public pushSize(size: number): void {
    // Take this new size and the most recent size and compute the change per
    // second, putting it into the `speeds` array to be used for a moving
    // average

    const time = new Date();

    const sizeDiff = size - this.mostRecent.size;
    const timeDiff = (time.getTime() - this.mostRecent.time.getTime()) / 1000;

    this.speeds.push(sizeDiff / timeDiff);
    this.mostRecent = {
      size,
      time,
    };

    // Keep a rolling average of the previous 10 seconds
    if (this.speeds.length > 10 * TICKS_PER_SECOND) this.speeds.shift();
  }


  public get speed(): number {
    if (this.speeds.length == 0) return -1;

    // Take the average speed (of the ones in the `speeds` array)
    else return this.speeds.reduce((a, c) => a + c) / this.speeds.length;
  }
}


export function serializeMap(map: Map<DownloadItem['id'], SpeedTracker>) {
  return [...map.entries()].reduce<DownloadSpeeds>((acc, [ key, value ]) => {
    acc[key] = value.speed;
    return acc;
  }, { });
}