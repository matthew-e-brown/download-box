<script lang="ts">
  import { searchDownloads } from '../shared';

  import Item from './components/Item.svelte';

  let items: chrome.downloads.DownloadItem[] = [ ];

  // Keep track of each page's start times (we can go forward by starting the
  // next page after the last item on the current page, but starting the
  // previous page after the first item in this page and searching for 5 items
  // will simply give us the first five)
  let startTimeStack: string[] = [ ];
  $: pageNumber = startTimeStack.length + 1;

  const searchOptions = {
    limit: 5,                   // five per page
    filenameRegex: '.+',        // exclude blank files (interrupted/deleted)
    orderBy: [ '-startTime' ],  // sort by time, descending (most recent first)
  };

  // Initialize items
  searchDownloads({ ...searchOptions }).then(array => items = array);

  const nextPage = async () => {
    const startedBefore = items[items.length - 1].startTime;
    const newItems = await searchDownloads({ ...searchOptions, startedBefore });

    // Paginate only if there are older downloads
    if (newItems.length) {
      // The new "previous page" is made of items from before X time: start it
      // *before* the startTime of the first item on the this page, so we
      // add one millisecond
      const beforeTime = new Date((new Date(items[0].startTime).getTime()) + 1);
      startTimeStack = [ ...startTimeStack, beforeTime.toISOString() ];
      items = newItems;
    }
  }

  const prevPage = async () => {
    const startedBefore = startTimeStack.pop();

    // Don't paginate if we are on the first page
    if (startedBefore === undefined) return;

    startTimeStack = startTimeStack; // trigger reaction to 'pop'

    // Don't need to check length, we know from the stack having items that
    // there are items in it
    items = await searchDownloads({ ...searchOptions, startedBefore });
  }

  const showAllDownloads = () => {
    chrome.tabs.create({ url: 'chrome://downloads' });
  }
</script>

<main>
  <h1>Downloads</h1>

  {#if items.length}
    <ul>
      {#each items as item} <Item {item} /> {/each}
    </ul>
  {:else}
    <div id="empty">There are no downloads in here...</div>
  {/if}

  <div id="page-buttons" class="box">
    <button type="button" on:click={prevPage}>Previous page</button>
    <button type="button" on:click={nextPage}>Next page</button>
    <div>Page { pageNumber }</div>
  </div>

  <div class="box">
    <a
      href="chrome://downloads" target="_blank"
      on:click|preventDefault={showAllDownloads}
    >Show all downloads</a>
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