<template>
  <li
    role="button"
    tabindex="0"
    @click="openFile"
    @click.right.stop.prevent="openOverlay"
    class="download-item"
    :class="itemClasses"
  >
    <img :src="icon" class="icon" width="32" height="32" aria-hidden="true" alt="" />

    <div class="info">
      <div class="name">{{ filename }}</div>
      <div class="size">{{ filesize }}</div>
    </div>

    <div class="button-row">
      <!-- If the item can be resumed or paused, offer to toggle -->
      <button
        type="button"
        class="icon-button"
        v-if="showResume"
        @click.stop="resumeDownload"
      ><fa-icon icon="play" fixed-width /></button>
      <button
        type="button"
        class="icon-button"
        v-else-if="showPause"
        @click.stop="pauseDownload"
      ><fa-icon icon="pause" fixed-width /></button>

      <!-- If the item has been deleted or interrupted, offer to retry -->
      <button
        type="button"
        class="icon-button"
        v-if="showRetry"
        @click.stop="retryDownload"
      ><fa-icon icon="arrow-rotate-left" fixed-width /></button>

      <!-- If the item exists, offer to show its location on disk -->
      <button
        type="button"
        class="icon-button"
        v-if="showFolder"
        @click.stop="showFile"
      ><fa-icon icon="folder-blank" fixed-width /></button>
    </div>

    <ProgressBar
      v-if="showBar"
      :percent="percent"
      :gradient-start="barColor.start"
      :gradient-end="barColor.end"
    />

    <transition name="slide-fade">
      <ItemOverlay
        v-if="isOverlayOpen"
        @click.stop="closeOverlay"
      >
        <button
          type="button"
          class="icon-button link-button"
          @click="copyLink"
        ><fa-icon icon="link" fixed-width /></button>
        <button
          type="button"
          class="icon-button erase-button"
          @click="eraseFromList"
        ><fa-icon icon="xmark" fixed-width /></button>
      </ItemOverlay>
    </transition>

  </li>
</template>


<script lang="ts">
import { defineComponent, PropType, ref, computed, watch, toRefs, Ref } from 'vue';
import { formatSize, computePercentage } from '@/common';

import downloads = chrome.downloads;
import DownloadItem = downloads.DownloadItem;

import ProgressBar from './Bar.vue';
import ItemOverlay from './ItemOverlay.vue';


function useConditions(item: Ref<DownloadItem>) {

  const showResume = computed(() => item.value.canResume);
  const showPause = computed(() => item.value.state == 'in_progress');

  const showRetry = computed(() => item.value.state == 'interrupted' || !item.value.exists);

  const showFolder = computed(() => item.value.exists);

  const showBar = computed(() => item.value.state == 'in_progress' || item.value.canResume);

  return {
    showResume,
    showPause,
    showRetry,
    showFolder,
    showBar,
  }
}


function useFileInfo(item: Ref<DownloadItem>) {

  const { showBar: inProgress } = useConditions(item);

  const filename = computed(() => {
    // Determine basename of file
    const path = item.value.filename;

    // Check if using '\' or '/' for Windows vs. *NIX
    const separator = path.indexOf('/') == -1 ? '\\' : '/';
    const filename = path.substring(path.lastIndexOf(separator) + 1);

    return filename.replace(/\.crdownload$/, '');
  });

  const percent = computed(() => {
    if (inProgress.value) {
      const { num, den } = computePercentage(item.value);
      return (den == 0) ? 0 : num / den;
    } else {
      return 1;
    }
  });


  const filesize = computed(() => {
    if (inProgress.value) {
      const { num, den } = computePercentage(item.value);
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
  components: { ProgressBar, ItemOverlay },
  props: {
    item: {
      type: Object as PropType<DownloadItem>,
      required: true,
    }
  },
  emits: {
    erase: (id: number) => typeof id == 'number',
    retry: (url: string) => typeof url == 'string',
    overlay: null,
  },
  setup(props, { emit }) {
    const { item } = toRefs(props);

    const showFile = () => downloads.show(item.value.id);
    const openFile = () => {
      if (item.value.state == 'complete') downloads.open(item.value.id);
    }

    const pauseDownload = () => downloads.pause(item.value.id);
    const resumeDownload = () => downloads.resume(item.value.id);

    const retryDownload = () => emit('retry', item.value.url);
    const eraseFromList = () => emit('erase', item.value.id);
    const copyLink = () => navigator.clipboard.writeText(item.value.finalUrl);

    const isOverlayOpen = ref(false);
    const closeOverlay = () => isOverlayOpen.value = false;
    const openOverlay = () => {
      isOverlayOpen.value = true;
      emit('overlay');
    }

    const barColor = computed<{ start: string, end: string }>(() => {
      let cssVarName;

      if (item.value.paused) {
        cssVarName = 'paused';
      } else if (item.value.state == 'interrupted') {
        cssVarName = 'error';
      } else {
        cssVarName = 'normal';
      }

      return {
        start: `var(--progress-bar-${cssVarName}1)`,
        end: `var(--progress-bar-${cssVarName}2)`,
      };
    });

    const itemClasses = computed(() => ({
      'error': item.value.state == 'interrupted' || !item.value.exists,
      'overlay-open': isOverlayOpen.value,
    }));


    return {
      ...useConditions(item),
      ...useFileInfo(item),
      openFile,
      showFile,
      pauseDownload,
      resumeDownload,
      retryDownload,
      eraseFromList,
      copyLink,
      isOverlayOpen,
      closeOverlay,
      openOverlay,
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
  &:not(.overlay-open):hover {
    border-color: var(--item-border);
    &.error { border-color: var(--item-border-error); }
  }

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

.erase-button {
  color: var(--button-confirm-fg);
  --button-color: var(--button-confirm-bg);
  --border-color: var(--button-confirm-border);
}

.error {

  .icon, .name, .size {
    opacity: 0.45;
  }

}

::v-deep(.progress-bar) {
  inset: -2px;
  top: unset;
  width: calc(100% + 4px);
}

.slide-fade-enter-active, .slide-fade-leave-active {
  transition-duration: 125ms;
  transition-timing-function: ease-out;
  transition-property: transform, opacity;
}

.slide-fade-enter-from, .slide-fade-leave-to {
  transform: translateX(10px);
  opacity: 0;
}

.slide-fade-enter-to, .slide-fade-leave-from {
  transform: translateX(0);
  opacity: 1;
}
</style>