<script lang="ts">
  import { searchDownloads } from '../shared';

  import Item from './components/Item.svelte';

  const showAllDownloads = () => {
    chrome.tabs.create({ url: 'chrome://downloads' });
  }

  let items = searchDownloads({
    limit: 5,
    filenameRegex: '.+',        // exclude blank files (interrupted/deleted)
    orderBy: [ '-startTime' ]   // sort by most-recent
  });
</script>

<main>
  <h1>Downloads</h1>

  {#await items}
    <div id="loading">Loading...</div>
  {:then array}
    <ul>
      {#each array as item} <Item {item} /> {/each}
    </ul>
  {/await}

  <div class="box">
    <button type="button">Previous page</button>
    <button type="button">Next page</button>
  </div>

  <div class="box">
    <a
      href="chrome://downloads"
      target="_blank"
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
</style>