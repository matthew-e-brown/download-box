<script lang="ts">
  import { onDestroy } from 'svelte';
  import { bodyText, search } from 'shared';

  import Item from './components/Item.svelte';

  // ===== Data =====

  const searchOptions = {
    limit: 5,                   // five per page
    filenameRegex: '.+',        // exclude blank files (interrupted/deleted)
    orderBy: [ '-startTime' ],  // sort by time, descending (most recent first)
  };

  let items: chrome.downloads.DownloadItem[] = [ ];

  // Keep track of each page's start times (we can go forward by starting the
  // next page *before* the last item on the current page, but starting the
  // previous page *after* the first item in this page and searching for 5 items
  // will simply give us the first five)
  let timeStack: string[] = [ ];
  $: pageNumber = timeStack.length + 1;

  // ===== Helper functions =====

  /**
   * Gets the ISO 8601 datestring for a given item, plus one millisecond. Used
   * for starting a page at that given item. If nothing is passed, the current
   * time's datestring is returned instead: used for starting at the first page.
   *
   * @param item The item to get the datestring from.
   * @returns An 8601 datestring.
   *
   * @note The +1ms comes from the fact that we start pages by querying with the
   * 'starts *before*' parameter: if we pass the exact time, the desired item
   * will be excluded.
   */
  const getStartTime = (item?: chrome.downloads.DownloadItem) => {
    // if they pass nothing just return the current time
    if (!item) return (new Date()).toISOString();
    // since it starts "before" the passed time, we add one millisecond to it
    return (new Date(new Date(item.startTime).getTime() + 1)).toISOString();
  }

  /**
   * Refresh the current list of items to update Svelte's view of them and
   * propagate to components. Does not change the current page.
   */
  const refreshItems = () => search({
    ...searchOptions,
    startedBefore: getStartTime(items.length ? items[0] : undefined)
  }).then<void>(array => void (items = array));

  // ===== Methods / event listeners =====

  const nextPage = async () => {
    const startedBefore = items[items.length - 1].startTime;
    const newItems = await search({ ...searchOptions, startedBefore });

    // Paginate only if there are older downloads
    if (newItems.length) {
      timeStack = [ ...timeStack, getStartTime(items[0]) ];
      items = newItems;
    }
  }

  const prevPage = async () => {
    const startedBefore = timeStack.pop();
    // Don't paginate if we are on the first page
    if (startedBefore === undefined) return;

    timeStack = timeStack; // trigger reaction to 'pop'

    // Don't need to check length, we know from the stack having items in it
    // that there are previous download-items in the query result
    items = await search({ ...searchOptions, startedBefore });
  }

  const eraseItem = ({ detail: toRemove }: CustomEvent<number>) => {
    chrome.downloads.erase({ id: toRemove }, async () => {
      // ('items' hasn't been updatd yet when this callback runs)

      let startedBefore: string;
      const index = items.findIndex(({ id }) => id == toRemove);

      // if this isn't the first page and they erased the first item, re-start
      // the page at what is currently the second item
      if (timeStack.length && index == 0) {
        startedBefore = getStartTime(items[1]);
      } else {
        startedBefore = getStartTime();
      }

      // Refresh the items with the new time
      items = await search({ ...searchOptions, startedBefore });
    });
  }

  const retryItem = ({ detail: url }: CustomEvent<string>) => {
    chrome.downloads.download({ url }, refreshItems);
  }

  const openDownloads = () => chrome.tabs.create({ url: 'chrome://downloads' });

  // ===== Setup / initialization =====

  refreshItems(); // Initialize items

  const onChanged = (change: chrome.downloads.DownloadDelta) => {
    if (items.find(({ id }) => change.id == id)) return;
    else refreshItems();
  }

  chrome.downloads.onChanged.addListener(onChanged);
  onDestroy(() => chrome.downloads.onChanged.removeListener(onChanged));
</script>

<main>
  <h1>{ bodyText('header') }</h1>

  {#if items.length}
    <ul id="download-list">
      {#each items as item}
        <Item {item} on:erase={eraseItem} on:retry={retryItem} />
      {/each}
    </ul>
  {:else}
    <div id="empty">{ bodyText('no_downloads') }</div>
  {/if}

  <div id="page-buttons">
    <button type="button" on:click={prevPage}>{ bodyText('next_page') }</button>
    <button type="button" on:click={nextPage}>{ bodyText('prev_page') }</button>
    <div>{ bodyText('page_number', pageNumber) }</div>
  </div>

  <div id="show-all">
    <a
      href="chrome://downloads" target="_blank"
      on:click|preventDefault={openDownloads}
    >{ bodyText('show_all') }</a>
  </div>
</main>

<style lang="scss">
  ul {
    display: block;

    margin: 0;
    padding: 0;
    list-style-type: none;
  }

  #empty {
    padding: 4rem 0;
  }
</style>