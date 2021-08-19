<script lang="ts">
  import Item from './components/Item.svelte';

  const search = (query: chrome.downloads.DownloadQuery) => {
    return new Promise<chrome.downloads.DownloadItem[]>(resolve => {
      chrome.downloads.search(query, resolve);
    });
  }

  const searchOptions = {
    limit: 5,                   // five per page
    filenameRegex: '.+',        // exclude blank files (interrupted/deleted)
    orderBy: [ '-startTime' ],  // sort by time, descending (most recent first)
  };

  let items: chrome.downloads.DownloadItem[] = [ ];

  // Keep track of each page's start times (we can go forward by starting the
  // next page after the last item on the current page, but starting the
  // previous page after the first item in this page and searching for 5 items
  // will simply give us the first five)
  let timeStack: string[] = [ ];
  $: pageNumber = timeStack.length + 1;

  // Initialize items
  search({ ...searchOptions }).then(array => items = array);

  // The new "previous page" will be made of items from before X time: when we
  // go to the next page, keep track of the start time of the first item on the
  // current page so we know what time to start it at when we come back to it
  const getStartTime = (item: chrome.downloads.DownloadItem) => {
    // since it starts "before" the passed time, we add one millisecond to it
    return (new Date(new Date(item.startTime).getTime() + 1)).toISOString();
  }

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

      let startedBefore = (new Date()).toISOString();
      const index = items.findIndex(({ id }) => id == toRemove);

      // if this isn't the first page and they erased the first item, re-start
      // the page at what is currently the second item
      if (timeStack.length && index == 0) {
        startedBefore = getStartTime(items[1]);
      }

      // Refresh the items with the new time
      items = await search({ ...searchOptions, startedBefore });
    });
  }

  const openDownloads = () => chrome.tabs.create({ url: 'chrome://downloads' });
</script>

<main>
  <h1>Downloads</h1>

  {#if items.length}
    <ul>
      {#each items as item}
        <Item {item} on:erase={eraseItem} />
      {/each}
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
      on:click|preventDefault={openDownloads}
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