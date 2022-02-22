<template>
  <main @click="closeAllOverlays(-1)" @click.right="closeAllOverlays(-1)">
    <h1>Downloads</h1>

    <ul id="downloads-list" v-if="items.length > 0">
      <Item
        v-for="(item, i) in items"
        :key="i"
        :item="item"
        :speeds-map="itemSpeeds"
        :ref="(el: any) => itemRefs[i] = el"
        @erase="eraseItem"
        @retry="retryItem"
        @overlay="closeAllOverlays(i)"
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

    <Transition name="popup">
      <div v-if="showCopiedPopup" class="popup">URL copied</div>
    </Transition>
  </main>
</template>


<script lang="ts">
import { defineComponent, ref, computed, onMounted, onUnmounted, onBeforeUpdate, provide, Ref } from 'vue';
import { search, getItemStartTime, Message, MessageType, DownloadSpeeds } from '@/common';
import { popupKey } from './main';

import downloads = chrome.downloads;
import DownloadItem = downloads.DownloadItem;
import DownloadQuery = downloads.DownloadQuery;
import runtime = chrome.runtime;

import Item from './components/Item.vue';


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


function usePopup(timeout: number) {
  const visible = ref(false);

  const hide = () => {
    visible.value = false;
  }

  const show = () => {
    visible.value = true;
    setTimeout(hide, timeout);
  }

  return { visible, show, hide };
}


export default defineComponent({
  name: 'App',
  components: { Item },
  setup() {

    const items = ref<DownloadItem[]>([ ]);
    const pagination = usePagination(items);

    const itemRefs = ref<InstanceType<typeof Item>[]>([ ]);
    const itemSpeeds = ref<DownloadSpeeds>({ });

    const copiedPopup = usePopup(3650);
    provide(popupKey, copiedPopup.show);


    const closeAllOverlays = (exceptIndex: number) => {
      itemRefs.value.forEach((item, i) => {
        if (i != exceptIndex) item?.closeOverlay();
      });
    }


    const refresh = async () => {
      items.value = await search({
        ...defaultSearchOptions,
        startedBefore: getItemStartTime(items.value[0])
      });
    }


    const retryItem = (url: string) => downloads.download({ url });

    const eraseItem = async (toRemove: number) => {
      // Remove the item
      await new Promise(resolve => {
        downloads.erase({ id: toRemove }, resolve);
      });

      /**
       * @note
       * We handle the `refresh()` call differently in this case because of the
       * possibility that they cleared the first item on the page. Just calling
       * `refresh` without taking care to check which one they deleted might
       * cause some weirdness, since the time of the first item on the page is
       * use in the `pageStack`.
       *
       * This is the same reason we don't have a downloads.onErased listener.
       */

      const deleted = items.value.findIndex(({ id }) => id == toRemove);
      const startedBefore = getItemStartTime(items.value[deleted == 0 ? 1 : 0]);

      items.value = await search({ ...defaultSearchOptions, startedBefore });
      closeAllOverlays(-1);
    }


    const downloadHandler = () => refresh();

    const messageHandler = (message: Message) => {
      switch (message.type) {

        case MessageType.StatusCheck:
          runtime.sendMessage({ type: MessageType.PopupOpened });
          break;

        case MessageType.Ping:
          if (message.payload) itemSpeeds.value = message.payload;
          refresh();
          break;

      }
    }


    onMounted(() => {
      refresh();
      runtime.onMessage.addListener(messageHandler);
      downloads.onCreated.addListener(downloadHandler);
      downloads.onChanged.addListener(downloadHandler);

      // Tell the background script that the popup was opened, so it can re-draw
      // the icon in the regular color
      runtime.sendMessage({ type: MessageType.PopupOpened });
    });

    onUnmounted(() => {
      runtime.onMessage.removeListener(messageHandler);
      downloads.onCreated.removeListener(downloadHandler);
      downloads.onChanged.removeListener(downloadHandler);
    });

    onBeforeUpdate(() => {
      // Clear the itemRefs because they are re-added each render
      itemRefs.value = [];
    });

    return {
      items,
      itemRefs,
      itemSpeeds,
      eraseItem,
      retryItem,
      closeAllOverlays,
      ...pagination,
      showCopiedPopup: copiedPopup.visible,
    };
  }
});
</script>


<style lang="scss" scoped>
main {
  padding-top: 1rem;
  position: relative;
}

h1 {
  font-size: 24px;
  font-weight: normal;
  text-align: center;

  margin-top: 0;
  margin-bottom: 1rem;
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
    background-color: var(--button-pages-bg);

    border: 2px solid transparent;
    &:hover { border-color: var(--button-pages-border); }

    margin: 0;
    padding: 0;
    border-radius: 4px;

    height: 38px;
    cursor: pointer;
  }
}

.popup {
  position: absolute;
  top: 12px;
  left: 12px;

  font-style: italic;
  font-size: 13px;

  padding: 4px 10px 4px 6px;
  border-radius: 4px;
  text-align: center;

  background-color: hsla(0, 0%, 0%, 0.75);
}


.popup-enter-active, .popup-leave-active {
  transition: transform 325ms cubic-bezier(0.70, -0.25, 0.45, 1.25);
}

.popup-enter-from, .popup-leave-to { transform: translateX(-120%); }
.popup-enter-to, .popup-leave-from { transform: translateX(0); }
</style>