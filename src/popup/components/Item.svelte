<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { bodyText } from 'shared';

  // A blank, 1x1, transparent .gif file to use as a placeholder 'src' attribute
  const emptyGIF = `data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7`;

  // @ts-ignore beacuse TS doesn't seem to recognize experimental new UA testing
  const showIn = (navigator.userAgentData)           // @ts-ignore next line too
    ? /mac/i.test(navigator.userAgentData.platform) ? 'Finder' : 'folder'
    : /mac/i.test(navigator.platform) ? 'Finder' : 'folder';

  const dispatch = createEventDispatcher<{
    'erase': number,  // id
    'retry': string,  // url
  }>();

  // ===== Props =====

  export let item: chrome.downloads.DownloadItem;

  // ===== Methods =====

  const basename = (path: string): string => {
    // Check if using '\' or '/' for Windows vs. *nix
    const separator = path.indexOf('/') == -1 ? '\\' : '/';
    const filename = path.substring(path.lastIndexOf(separator) + 1);
    return filename.replace(/\.crdownload$/, '');
  }

  // https://stackoverflow.com/a/18650828/10549827
  const formatSize = (bytes: number): string => {
    if (bytes == -1) return '? Bytes';
    else if (bytes == 0) return '0 Bytes';

    const k = 1000;
    const s = [ 'Bytes', 'KB', 'MB', 'GB', 'TB' ];
    const i = Math.floor(Math.log10(bytes) / Math.log10(k));
    const p = i == 0 ? 0 : 2; // hide decimals if 'Bytes'

    return `${(bytes / Math.pow(k, i)).toFixed(p)} ${s[i]}`;
  }

  const open = () => chrome.downloads.open(item.id);
  const show = () => chrome.downloads.show(item.id);
  const retry = () => dispatch('retry', item.url);
  const erase = () => dispatch('erase', item.id);

  // ===== Reactive =====

  let title: string = '';
  let bytes: string = '? Bytes';
  let image: string = emptyGIF;
  let state: string = '';

  $: {
    title = basename(item.filename);
    bytes = formatSize(item.fileSize);
    image = emptyGIF; // set to blank while the new one loads
    state = !item.exists ? 'deleted' : item.state.replaceAll('_', '-');

    chrome.downloads.getFileIcon(item.id, { size: 32 }, src => {
      image = (src || emptyGIF);
    });
  }
</script>

<li class="download { state }">
  <img src={image} width="32" height="32" alt="" aria-hidden="true" />

  <div class="body" role="button" on:click={open}>

    <span class="title">{ title }</span>

    <div class="controls">
      <span class="file-size">{ bytes }</span>
      {#if item.exists}
        <span class="action" role="button" on:click|stopPropagation={show}>
          { bodyText('show_in', showIn) }
        </span>
      {:else if state != 'complete'} <!-- !exists and also not complete -->
        <span class="action" role="button" on:click|stopPropagation={retry}>
          { bodyText('download_again') }
        </span>
      {/if}
      <span class="action" role="button" on:click|stopPropagation={erase}>
        { bodyText('erase_item') }
      </span>
    </div>

  </div>
</li>

<style lang="scss">
.download {
  display: grid;
  grid-template-columns: 4em 1fr;

  box-sizing: border-box;
  height: 3.25rem;

  --status-color: transparent;

  &.paused { --status-color: #ffcc00; }
  &.complete { --status-color: #65ce46; }
  &.in-progress { --status-color: #52b4ff; }
  &.interrupted, &.deleted { --status-color: #f77878; }

  border-left: 0.35em solid var(--status-color);
}
</style>