<template>
    <main @click="closeAllOverlays()" @click.right="closeAllOverlays()">
        <h1>Downloads</h1>

        <ul id="downloads-list" v-if="items.length > 0">
            <Item
                v-for="(item, i) in items"
                :key="i"
                :item="item"
                :speeds-map="itemSpeeds"
                @erase="eraseItem"
                @retry="retryItem"
                @overlay="closeAllOverlays(item.id)"
                ref="itemRefs"
            />
        </ul>
        <div id="empty" v-else>
            <span>Files you download will appear here.</span>
        </div>

        <div id="page-buttons">
            <button
                id="prev-page"
                type="button"
                @click="prevPage"
                :disabled="pageNumber == 1"
            >
                <FaIcon icon="left" title="Previous page" fixed-width />
            </button>
            <div>Page {{ pageNumber }}</div>
            <button
                id="next-page"
                type="button"
                @click="nextPage"
                :disabled="pageNumber >= Math.ceil(totalItems / 5)"
            >
                <FaIcon icon="right" title="Next page" fixed-width />
            </button>
        </div>

        <Transition name="popup">
            <div v-if="isCopiedPopupVisible" class="popup">URL copied</div>
        </Transition>
    </main>
</template>


<script lang="ts">
function usePopup(timeout: number) {
    const visible = ref(false);

    const hide = () => visible.value = false;
    const show = () => {
        visible.value = true;
        setTimeout(hide, timeout);
    }

    return { visible, show, hide };
}

const defaultSearchOptions: DownloadQuery = Object.freeze({
    limit: 5,
    filenameRegex: '.+',
    orderBy: [ '-startTime' ],
});
</script>


<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, provide } from 'vue';
import { search, getItemStartTime, DownloadSpeeds, Ping } from '@/common';
import { showCopiedKey } from './main';

import { FontAwesomeIcon as FaIcon } from '@fortawesome/vue-fontawesome';
import Item from './components/Item.vue';

import downloads = chrome.downloads;
import DownloadItem = downloads.DownloadItem;
import DownloadQuery = downloads.DownloadQuery;
import runtime = chrome.runtime;


// =================================================================================================


// Our connection to the backend
let port: runtime.Port | null = null;

// The download items directly from Chrome's API
const items = ref<DownloadItem[]>([ ]);
const itemRefs = ref<InstanceType<typeof Item>[] | null>(null);
const itemSpeeds = ref<DownloadSpeeds>();

const totalItems = ref(5);


/*
 * To change pages, we perform a new search with a `startBefore` time. To move earlier in time to
 * the next page, we search for everything before the earliest item on this page (if there are five
 * items, search for everything before item five).
 *
 * To move backwards (more recently in time; from page two to one), we need to keep track of the
 * `startTime`s of all of our previous pages. This stack holds those times (as ISO 8601 stamps).
 */

const pageStack = ref<string[]>([ ]);
const pageNumber = computed(() => pageStack.value.length + 1);

const prevPage = async () => {
    const startedBefore = pageStack.value.pop();

    // Don't paginate if this is the first page
    if (startedBefore) {
        items.value = await search({ ...defaultSearchOptions, startedBefore });
    }
}

const nextPage = async () => {
    const startedBefore = items.value[items.value.length - 1].startTime;
    const newItems = await search({ ...defaultSearchOptions, startedBefore });

    // Don't paginate if there are no earlier items
    if (newItems.length) {
        pageStack.value.push(getItemStartTime(items.value[0]));
        items.value = newItems;
    }
}


const { visible: isCopiedPopupVisible, show: showCopiedPopup } = usePopup(3650);
provide(showCopiedKey, showCopiedPopup);


const closeAllOverlays = (exceptId: number = -1) => {
    if (!itemRefs.value) return;

    for (const item of itemRefs.value) {
        if (item.itemId != exceptId) item.closeOverlay();
    }
}


const refresh = async () => {
    items.value = await search({
        ...defaultSearchOptions,
        startedBefore: getItemStartTime(items.value[0]),
    });
}


const retryItem = (url: string) => downloads.download({ url });

const eraseItem = async (toRemove: number) => {
    // Actually remove the item before we refresh
    await downloads.erase({ id: toRemove });
    totalItems.value -= 1;

    /*
     * We handle the `refresh()` call differently in this case because of the possibility
     * that they cleared the first item on the page. Just calling `refresh` without taking
     * care to check which one they deleted might cause some weirdness, since the time of
     * the first item on the page is use in the `pageStack`.
     *
     * This is the same reason we don't have a downloads.onErased listener.
     */

    const delIndex = items.value.findIndex(({ id }) => id == toRemove);
    const startedBefore = getItemStartTime(items.value[delIndex == 0 ? 1 : 0]);

    items.value = await search({ ...defaultSearchOptions, startedBefore });
    closeAllOverlays();
}


const onDownloadHandler = () => refresh();
const onMessageHandler = (message: Ping) => {
    if (message.payload) itemSpeeds.value = message.payload;
    refresh();
}


onMounted(async () => {
    port = runtime.connect();
    port.onMessage.addListener(onMessageHandler);

    downloads.onCreated.addListener(onDownloadHandler);
    downloads.onChanged.addListener(onDownloadHandler);

    refresh();

    // Because the pool from which the downloads API lets us search through doesn't update until the
    // popup is re-opened, we can get away with setting this value only once.
    totalItems.value = (await search({
        ...defaultSearchOptions,
        limit: 0,
    })).length;
});

onUnmounted(() => {
    port?.onMessage.removeListener(onMessageHandler);
    port = null;

    downloads.onCreated.removeListener(onDownloadHandler);
    downloads.onChanged.removeListener(onDownloadHandler);
});
</script>


<style lang="scss" scoped>
main {
    padding-top: 1rem;
    padding-bottom: 1px;
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

ul, #empty {
    height: 375px;
}

#empty {
    display: flex;
    align-items: center;
    justify-content: center;
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

        display: flex;
        align-items: center;
        justify-content: center;

        &[disabled] {
            color: var(--main-fg-dim);
            cursor: default;
            &:hover { border-color: transparent; }
        }
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
