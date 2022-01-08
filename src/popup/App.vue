<template>
  <main @click="closeModals(-1)" @click.right="closeModals(-1)">
    <h1>Downloads</h1>

    <ul id="downloads-list" v-if="items.length > 0">
      <Item
        v-for="(item, i) in items"
        :key="i"
        :item="item"
        :ref="(el: any) => itemRefs[i] = el"
        @erase="eraseItem"
        @retry="retryItem"
        @modal="closeModals(i)"
      />
    </ul>
    <div id="empty" v-else>There's nothing here...</div>

    <div id="page-buttons">
      <button id="prev-page" type="button" @click="prevPage">
        <fa-icon icon="left" fixed-width />
      </button>
      <div>Page {{ pageNumber }}</div>
      <button id="next-page" type="button" @click="nextPage">
        <fa-icon icon="right" fixed-width />
      </button>
    </div>
  </main>
</template>


<script lang="ts">
import { defineComponent, ref, computed, Ref, onMounted, onUnmounted, onBeforeUpdate } from 'vue';
import { search, getItemStartTime, Message } from '@/common';

import downloads = chrome.downloads;
import DownloadItem = downloads.DownloadItem;
import DownloadQuery = downloads.DownloadQuery;
import onMessage = chrome.runtime.onMessage;

import Item from './Item.vue';


const defaultSearchOptions: DownloadQuery = {
  limit: 5,
  filenameRegex: '.+',
  orderBy: [ '-startTime' ],
};


function usePagination(items: Ref<DownloadItem[]>) {

  /**
   * @note
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


    const itemRefs = ref<InstanceType<typeof Item>[]>([ ]);

    const closeModals = (except: number) => {
      itemRefs.value.forEach((item, i) => {
        if (i != except) item.closeModal();
      });
    }


    const refresh = async () => {
      closeModals(-1);
      items.value = await search({
        ...defaultSearchOptions,
        startedBefore: getItemStartTime(items.value[0])
      });
    }


    const eraseItem = async (toRemove: number) => {
      // Remove the item
      await new Promise(resolve => {
        downloads.erase({ id: toRemove }, resolve)
      });

      /**
       * @note
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


    const retryItem = (url: string) => {
      // 'refresh' will be handled by the onMessage handler
      downloads.download({ url });
    }


    /**
     * @note Because of the way Chrome's `downloads.search` API works, we are
     * unable to get new downloads without re-loading the popup. It seems that
     * the list of downloads is cached on open, and that `search` simply queries
     * that list. This means that any edits made in the CTRL+J downloads list do
     * not appear until that tab is closed and the popup is refreshed.
     *
     * So, we used this property to signal to the user that there are new
     * downloads
     */
    const dirty = ref<false | 'new' | 'del'>(false);

    const messageHandler = (message: Message) => {
      if (message == Message.NewDownload) dirty.value = 'new';
      else if (message == Message.Erased) dirty.value = 'del';

      refresh();
    }

    onMounted(() => {
      refresh();
      onMessage.addListener(messageHandler);
    });

    onUnmounted(() => {
      onMessage.removeListener(messageHandler);
    });

    onBeforeUpdate(() => {
      itemRefs.value = [];
    });

    return {
      dirty,
      items,
      itemRefs,
      eraseItem,
      retryItem,
      closeModals,
      ...pagination,
    };
  }
});
</script>


<style lang="scss" scoped>
h1 {
  font-size: 24px;
  font-weight: normal;
  text-align: center;
}

ul {
  list-style: none;
  margin: 0;
  padding: 0;
}

#page-buttons {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  column-gap: 4px;
  padding: 4px;

  div {
    text-align: center;
    place-self: center;

    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;

    max-width: 100%;
    padding: 0 8px;
  }

  button {
    color: inherit;
    background-color: var(--button-bg2);

    border: 2px solid transparent;
    &:hover { border-color: var(--accent1); }

    margin: 0;
    padding: 0;
    border-radius: 4px;

    height: 38px;
    cursor: pointer;
  }
}
</style>