<template>
  <li @click="openFile">
    <img :src="icon" width="32" height="32" aria-hidden="true" alt="" />
    <span class="name">{{ filename }}</span>
    <span class="size">{{ filesize }}</span>

    <div class="buttons">
      <!-- First pair: if the download can be resumed or paused, offer to toggle -->
      <button
        type="button"
        v-if="item.canResume"
        @click.stop="resumeDownload"
      ></button>
      <button
        type="button"
        v-else-if="item.state == 'in_progress'"
        @click.stop="pauseDownload"
      ></button>
      <!--  -->

      <!-- If the download has been deleted or interrupted, offer to retry -->
      <button
        type="button"
        v-if="item.state == 'interrupted' || !item.exists"
        @click.stop="retryDownload"
      ></button>

      <!-- If the item is not currently downloading, offer to clear from list -->
      <button
        type="button"
        v-if="item.state != 'in_progress'"
        @click.stop="eraseFromList"
      ></button>
    </div>

    <div
      v-if="item.state == 'in_progress' || item.canResume"
      class="progress-bar" :class="barColor"
    >
      <div></div>
    </div>

  </li>
</template>


<script lang="ts">
import { defineComponent, PropType, ref, computed, watch, toRefs, Ref } from 'vue';
import { formatSize, isMac } from '@/common';

import DownloadItem = chrome.downloads.DownloadItem;
import bodyText = chrome.i18n.getMessage;


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
      chrome.downloads.getFileIcon(item.value.id, { size: 32 }, resolve)
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

    const openFile = () => chrome.downloads.open(item.value.id);
    const showFile = () => chrome.downloads.show(item.value.id);

    const pauseDownload = () => chrome.downloads.pause(item.value.id);
    const resumeDownload = () => chrome.downloads.resume(item.value.id);

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