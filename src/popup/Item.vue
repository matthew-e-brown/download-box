<template>
  <li
    role="button"
    tabindex="0"
    @click="openFile"
    class="download-item"
    :class="{ error: item.state == 'interrupted' || !item.exists }"
  >
    <img :src="icon" class="icon" width="32" height="32" aria-hidden="true" alt="" />

    <div class="info">
      <div class="name">{{ filename }}</div>
      <div class="size">{{ filesize }}</div>
    </div>

    <div class="buttons">
      <!-- If the item can be resumed or paused, offer to toggle -->
      <button
        type="button"
        v-if="item.canResume"
        @click.stop="resumeDownload"
      ><fa-icon icon="play" fixed-width /></button>
      <button
        type="button"
        v-else-if="item.state == 'in_progress'"
        @click.stop="pauseDownload"
      ><fa-icon icon="pause" fixed-width /></button>

      <!-- If the item has been deleted or interrupted, offer to retry -->
      <button
        type="button"
        v-if="item.state == 'interrupted' || !item.exists"
        @click.stop="retryDownload"
      ><fa-icon icon="arrow-rotate-left" fixed-width /></button>

      <!-- If the item exists, offer to show its location on disk -->
      <button
        type="button"
        v-if="item.exists"
        @click.stop="showFile"
      ><fa-icon icon="folder-blank" fixed-width /></button>
    </div>

    <ProgressBar
      v-if="item.state == 'in_progress' || item.canResume"
      :percent="item.bytesReceived / item.totalBytes"
      gradient-start="#14415A"
      gradient-end="#00A3FF"
    />

  </li>
</template>


<script lang="ts">
import { defineComponent, PropType, ref, computed, watch, toRefs, Ref } from 'vue';
import { formatSize, isMac } from '@/common';

import downloads = chrome.downloads;
import DownloadItem = downloads.DownloadItem;
import bodyText = chrome.i18n.getMessage;

import ProgressBar from './Bar.vue';


enum ItemState {
  Valid,
  Error,
  Progress,
}


function useFileInfo(item: Ref<DownloadItem>) {

  const filename = computed(() => {
    // Determine basename of file
    const path = item.value.filename;

    // Check if using '\' or '/' for Windows vs. *NIX
    const separator = path.indexOf('/') == -1 ? '\\' : '/';
    const filename = path.substring(path.lastIndexOf(separator) + 1);

    return filename.replace(/\.crdownload$/, '');
  });


  const filesize = computed(() => {
    if (item.value.state == 'in_progress') {
      const a = formatSize(item.value.bytesReceived);
      const b = formatSize(item.value.totalBytes);
      return `${a} / ${b}`;
    } else {
      return formatSize(item.value.fileSize);
    }
  });

  // Defaults to a blank, 1x1, transparent `.gif` file (placeholder)
  const icon = ref('data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');

  watch(item, async () => {
    const src = await new Promise<string>(resolve => {
      downloads.getFileIcon(item.value.id, { size: 32 }, resolve)
    });

    if (src) icon.value = src;
  }, {
    immediate: true
  });


  return {
    filename,
    filesize,
    icon,
  };
}


export default defineComponent({
  name: 'Item',
  components: { ProgressBar },
  props: {
    item: {
      type: Object as PropType<DownloadItem>,
      required: true,
    }
  },
  emits: {
    erase: (id: number) => typeof id == 'number',
    retry: (url: string) => typeof url == 'string',
  },
  setup(props, { emit }) {
    const { item } = toRefs(props);
    const folderOrFinder = bodyText(`location_${isMac ? 'macos' : 'folder'}`);

    const openFile = () => downloads.open(item.value.id);
    const showFile = () => downloads.show(item.value.id);

    const pauseDownload = () => downloads.pause(item.value.id);
    const resumeDownload = () => downloads.resume(item.value.id);

    const retryDownload = () => emit('retry', item.value.url);
    const eraseFromList = () => emit('erase', item.value.id);

    const state = computed<ItemState>(() => {
      if (!item.value.exists) return ItemState.Error;

      switch (item.value.state) {
        case 'complete': return ItemState.Valid;
        case 'in_progress': return ItemState.Progress;
        case 'interrupted': return ItemState.Error;
      }
    });

    const barColor = computed(() => {
      if (item.value.state == 'in_progress') {
        if (item.value.paused) return 'paused';
        else return 'regular';
      } else if (item.value.state == 'interrupted') {
        return 'error';
      }
    });


    return {
      folderOrFinder,
      ...useFileInfo(item),
      openFile,
      showFile,
      pauseDownload,
      resumeDownload,
      retryDownload,
      eraseFromList,
      state,
      barColor,
      ItemState,
    };

  },
});
</script>


<style lang="scss" scoped>
.download-item {
  height: 75px;
  padding: 0 14px;
  position: relative;

  border: 2px solid transparent;
  &:hover { border-color: var(--accent1); }

  display: grid;
  grid-template-rows: 1fr;
  grid-template-columns: 48px minmax(0, 1fr) min-content;
  align-items: center;

  column-gap: 24px;

  background-color: var(--item-bg1);
  &:nth-child(2n+2) { background-color: var(--item-bg2); }

  cursor: pointer;
}

.icon {
  display: block;
  justify-self: center;
}

.info {
  display: flex;
  flex-flow: column nowrap;
  row-gap: 4px;
}

.name {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.size {
  font-size: 12px;
}

.buttons {

  display: flex;
  flex-flow: row nowrap;
  justify-content: flex-end;
  column-gap: 14px;

  button {
    width: 40px;
    height: 40px;
    border-radius: 50%;

    border: 2px solid transparent;
    &:hover { border-color: var(--accent2); }

    margin: 0;
    padding: 2px;

    display: flex;
    align-items: center;
    justify-content: center;

    color: inherit;
    background-color: var(--button-bg1);

    cursor: pointer;
  }
}

.error {

  .icon, .name, .size {
    opacity: 0.45;
  }

}

::v-deep(.progress-bar) {
  inset: -1px;
  top: unset;
}
</style>