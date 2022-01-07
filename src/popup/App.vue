<template>
  <h1>Downloads</h1>

  <ul id="downloads-list" v-if="items.length > 0">
    <Item
      v-for="(item, i) in items"
      :key="i"
      :item="item"
      @erase="eraseItem"
      @retry="retryItem"
    />
  </ul>
  <div id="empty" v-else>There's nothing here...</div>

  <div id="page-buttons">
    <button id="prev-page" type="button" @click="prevPage">

    </button>
    <span>{{ pageNumber }}</span>
    <button id="next-page" type="button" @click="nextPage">

    </button>
  </div>
</template>


<script lang="ts">
import { defineComponent, ref, computed, Ref, onMounted, onUnmounted } from 'vue';
import { search, getItemStartTime } from '@/common';

import DownloadItem = chrome.downloads.DownloadItem;
import DownloadQuery = chrome.downloads.DownloadQuery;
import DownloadDelta = chrome.downloads.DownloadDelta;

import bodyText = chrome.i18n.getMessage;

import Item from './Item.vue';


const defaultSearchOptions: DownloadQuery = {
  limit: 5,
  filenameRegex: '.+',
  orderBy: [ '-startTime' ],
};


function usePagination(items: Ref<DownloadItem[]>) {

  /**
   * @note
   *
   * To change pages, we perform a new search with a `startBefore` time. To move
   * earlier in time to the next page, we search for everything before the
   * earliest item on this page (if there are five items, search for everything
   * before item five).
   *
   * To move backwards (more recently in time; from page two to one), we need to
   * keep track of the `startTime`s of all of our previous pages. This stack
   * holds those times (as ISO 8601 stamps).
   */

  const stack = ref<string[]>([ ]);
  const pageNumber = computed(() => stack.value.length + 1);


  const prevPage = async () => {
    const startedBefore = stack.value.pop();

    // Don't paginate if this is the first page
    if (startedBefore === undefined) return;

    items.value = await search({ ...defaultSearchOptions, startedBefore });
  };


  const nextPage = async () => {
    const startedBefore = items.value[items.value.length - 1].startTime;
    const newItems = await search({ ...defaultSearchOptions, startedBefore });

    // Don't paginate if there are no earlier items
    if (newItems.length) {
      stack.value.push(getItemStartTime(items.value[0]));
      items.value = newItems;
    }
  };


  return {
    pageNumber,
    prevPage,
    nextPage,
  };
}


export default defineComponent({
  name: 'App',
  components: { Item },
  setup() {

    const items = ref<DownloadItem[]>([ ]);
    const pagination = usePagination(items);

    const refresh = async () => {
      items.value = await search({
        ...defaultSearchOptions,
        startedBefore: getItemStartTime(items.value[0])
      });
    }

    const onChanged = (change: DownloadDelta) => {
      // Check if the changed item is visible on this page
      if (items.value.find(({ id }) => change.id == id)) refresh();
    }

    onMounted(() => chrome.downloads.onChanged.addListener(onChanged));
    onUnmounted(() => chrome.downloads.onChanged.removeListener(onChanged));

    const eraseItem = async (toRemove: number) => {
      // Remove the item
      await new Promise(resolve => {
        chrome.downloads.erase({ id: toRemove }, resolve)
      });

      /**
       * @note
       *
       * We have to handle the `refresh()` ourselves because of the possibility
       * that they're on a deeper page. Just calling `refresh` without taking
       * care to check if they deleted the first item in the page can cause some
       * weirdness.
       */

      let startedBefore: string;
      const index = items.value.findIndex(({ id }) => id == toRemove);

      // If this is not the first page, and they deleted the first item, use the
      // second item as the `startTime` item
      if (pagination.pageNumber.value > 1 && index == 0) {
        startedBefore = getItemStartTime(items.value[1]);
      } else {
        startedBefore = getItemStartTime();
      }

      items.value = await search({ ...defaultSearchOptions, startedBefore });
    }

    const retryItem = async (url: string) => {
      chrome.downloads.download({ url }, refresh);
    }

    onMounted(refresh);

    return {
      items,
      eraseItem,
      retryItem,
      bodyText,
      ...pagination,
    };
  }
});
</script>


<!-- Main 'App' SCSS does not need to be scoped -->
<style lang="scss">
:root {
  font-family: sans-serif;
  font-style: 16px;
  font-weight: 400;
}

body {
  margin: 0;
  padding: 0;
  width: 420px;
  user-select: none;
}
</style>