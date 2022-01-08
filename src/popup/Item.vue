<template>
  <li
    role="button"
    tabindex="0"
    @click="openFile"
    @click.right.stop.prevent="openModal"
    class="download-item"
    :class="itemClasses"
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
      :percent="percent"
      gradient-start="#14415A"
      gradient-end="#00A3FF"
    />

    <Modal
      text="Remove this item from the list?"
      v-if="modalOpen"
      @click.stop
      @yes="eraseFromList"
      @no="closeModal"
    />

  </li>
</template>


<script lang="ts">
import { defineComponent, PropType, ref, computed, watch, toRefs, Ref } from 'vue';
import { formatSize } from '@/common';

import downloads = chrome.downloads;
import DownloadItem = downloads.DownloadItem;

import ProgressBar from './Bar.vue';
import Modal from './Modal.vue';


function useFileInfo(item: Ref<DownloadItem>) {

  const filename = computed(() => {
    // Determine basename of file
    const path = item.value.filename;

    // Check if using '\' or '/' for Windows vs. *NIX
    const separator = path.indexOf('/') == -1 ? '\\' : '/';
    const filename = path.substring(path.lastIndexOf(separator) + 1);

    return filename.replace(/\.crdownload$/, '');
  });

  const compute = () => {
    // Use `fileSize` as a fallback if `totalBytes` is unknown
    const { bytesReceived, totalBytes, fileSize } = item.value;
    return {
      num: bytesReceived,
      den: totalBytes > 0 ? totalBytes : fileSize
    };
  }

  const percent = computed(() => {
    if (item.value.state == 'in_progress' || item.value.canResume) {
      const { num, den } = compute();
      if (den == 0) return 0;
      else return num / den;
    } else {
      return 1;
    }
  });


  const filesize = computed(() => {
    if (item.value.state == 'in_progress' || item.value.canResume) {
      const { num, den } = compute();
      return `${formatSize(num)} / ${formatSize(den)}`;
    } else {
      return formatSize(item.value.fileSize);
    }
  });

  // Defaults to a blank, 1x1, transparent `.gif` file (placeholder)
  const icon = ref('data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');

  // Use a `watch` instead of a regular computed because `getFileIcon` is
  // asynchronous
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
    percent,
    icon,
  };
}


export default defineComponent({
  name: 'Item',
  components: { ProgressBar, Modal },
  props: {
    item: {
      type: Object as PropType<DownloadItem>,
      required: true,
    }
  },
  emits: {
    erase: (id: number) => typeof id == 'number',
    retry: (url: string) => typeof url == 'string',
    modal: null,
  },
  setup(props, { emit }) {
    const { item } = toRefs(props);

    const openFile = () => downloads.open(item.value.id);
    const showFile = () => downloads.show(item.value.id);

    const pauseDownload = () => downloads.pause(item.value.id);
    const resumeDownload = () => downloads.resume(item.value.id);

    const retryDownload = () => emit('retry', item.value.url);
    const eraseFromList = () => emit('erase', item.value.id);


    const modalOpen = ref(false);
    const closeModal = () => modalOpen.value = false;
    const openModal = () => {
      modalOpen.value = true;
      emit('modal');
    }


    const barColor = computed(() => {
      if (item.value.state == 'in_progress') {
        if (item.value.paused) return 'paused';
        else return 'regular';
      } else if (item.value.state == 'interrupted') {
        return 'error';
      }
    });

    const itemClasses = computed(() => ({
      'error': item.value.state == 'interrupted' || !item.value.exists,
      'modal-open': modalOpen.value
    }));


    return {
      ...useFileInfo(item),
      openFile,
      showFile,
      pauseDownload,
      resumeDownload,
      retryDownload,
      eraseFromList,
      modalOpen,
      closeModal,
      openModal,
      barColor,
      itemClasses,
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
  &:not(.modal-open):hover { border-color: var(--accent1); }

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