<template>
  
</template>


<script lang="ts">
import { defineComponent, PropType, computed, toRefs, Ref } from 'vue';
import { formatSize, isMac } from '@/common';

import DownloadItem = chrome.downloads.DownloadItem;
import bodyText = chrome.i18n.getMessage;


function useFileInfo(item: Ref<DownloadItem>) {

  const title = computed(() => {
    // Determine basename of file
    const path = item.value.filename;

    // Check if using '\' or '/' for Windows vs. *NIX
    const separator = path.indexOf('/') == -1 ? '\\' : '/';
    const filename = path.substring(path.lastIndexOf(separator) + 1);

    return filename.replace(/\.crdownload$/, '');
  });


  const bytes = computed(() => {
    if (item.value.state == 'in_progress') {
      const a = formatSize(item.value.bytesReceived);
      const b = formatSize(item.value.totalBytes);
      return `${a} / ${b}`;
    } else {
      return formatSize(item.value.fileSize);
    }
  });


  const image = computed(async () => {
    const src = await new Promise<string>(resolve => {
      chrome.downloads.getFileIcon(item.value.id, { size: 32 }, resolve);
    });

    if (src) {
      return src;
    } else {
      // A blank, 1x1, transparent .gif file to use as a placeholder
      return 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    }
  });


  return {
    title,
    bytes,
    image,
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
  setup(props) {
    const { item } = toRefs(props);
    const folderOrFinder = bodyText(`location_${isMac ? 'macos' : 'folder'}`);

    return {
      ...useFileInfo(item),
      folderOrFinder,
    };

  },
});
</script>