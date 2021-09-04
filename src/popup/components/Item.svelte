<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { bodyText } from 'shared';

  // A blank, 1x1, transparent .gif file to use as a placeholder 'src' attribute
  const emptyGIF = `data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7`;

  // @ts-ignore beacuse TS doesn't seem to recognize experimental new UA testing
  const showIn = (navigator.userAgentData) // @ts-ignore next line too
    ? /mac/i.test(navigator.userAgentData.platform) ? 'macos' : 'folder'
    : /mac/i.test(navigator.platform) ? 'macos' : 'folder';

  const folderOrFinder = bodyText(`location_${showIn}`);

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
    const p = i && 2; // 0 decimals if index is 0; no decimals for 'Bytes'

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

  $: title = basename(item.filename);
  $: state = !item.exists ? 'deleted' : item.state.replaceAll('_', '-');

  $: if (item.state == 'in_progress') {
    bytes = `${formatSize(item.bytesReceived)} / ${formatSize(item.totalBytes)}`
  } else {
    bytes = formatSize(item.fileSize);
  }

  $: chrome.downloads.getFileIcon(item.id, { size: 32 }, src => {
    image = (src || emptyGIF);
  });

  let barRole: string | null = null;
  let valueMin: number | null = null;
  let valueMax: number | null = null;
  let valueNow: number | null = null;

  $: if (state == 'in-progress') {
    barRole = 'progressbar';
    valueMin = 0;
    valueMax = 0;
    valueNow = item.bytesReceived / item.totalBytes * 100;
  } else {
    valueMin = valueMax = valueNow = null;
  }
</script>

<li class="download { state }" role="button" tabindex="0" on:click={open}>
  <img src={image} width="32" height="32" alt="" aria-hidden="true" />

  <div class="body">

    <span class="title">{ title }</span>

    <div
      class="progress"
      class:hidden={item.state != 'in_progress'}
      role={barRole}
      aria-valuemin={valueMin}
      aria-valuemax={valueMax}
      aria-valuenow={valueNow}
    >
      <div class="bar" style="width: {valueNow}%"></div>
    </div>

    <div class="controls">
      <span class="file-size">{ bytes }</span>
      {#if item.exists}
        <span class="action" role="button" tabindex="0" on:click|stopPropagation={show}>
          { bodyText('show_in', folderOrFinder) }
        </span>
      {:else if state != 'complete'} <!-- does not exist and also not 'complete'; deleted -->
        <span class="action" role="button" tabindex="0" on:click|stopPropagation={retry}>
          { bodyText('download_again') }
        </span>
      {/if}
      <span class="action" role="button" tabindex="0" on:click|stopPropagation={erase}>
        { bodyText('erase_item') }
      </span>
    </div>

  </div>
</li>

<style lang="scss">
.download {
  display: grid;
  // https://css-tricks.com/preventing-a-grid-blowout/
  grid-template-columns: auto minmax(0, 1fr);
  column-gap: 0.95em;

  --status-color: transparent; // fallback

  &.paused { --status-color: #ffcc00; }
  &.complete { --status-color: #65ce46; }
  &.in-progress { --status-color: #52b4ff; }
  &.interrupted, &.deleted { --status-color: #f77878; }

  border-radius: 0 0.25em 0.25em 0;
  border: 0.20em solid transparent;
  border-left: 0.35em solid var(--status-color) !important;

  margin-bottom: 0.15em;

  cursor: pointer;

  >img {
    align-self: flex-start;
    justify-self: flex-end;
    margin: 0.85em 0 0.35em 0.90em;
  }

  .body {
    padding: 0.85em 1.25em 0.90em 0;
    height: 2.75rem;

    display: flex;
    flex-flow: column nowrap;
    justify-content: space-between;
  }

  .title {
    font-weight: bold;
    color: var(--color-title);

    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
  }

  &.interrupted, &.deleted {
    >img { filter: grayscale(1); }

    .title {
      opacity: 0.75;
      text-decoration-line: line-through;
    }
  }

  .progress {
    height: 0.25em;

    position: relative;
    align-self: stretch;

    .bar {
      position: absolute;
      top: 0; left: 0;
      height: 100%;

      background-color: var(--status-color);
    }
  }

  .controls {
    display: flex;
    flex-flow: row nowrap;
    >:first-child { margin-left: 0; }
    >:last-child { margin-right: 0; }
  }

  .file-size {
    margin-right: auto;
    color: #999;
  }

  .action {
    margin: 0 0.75em;
    color: var(--color-action);
    padding: 0.10em 0.10em 0;
    border-bottom: 0.10em solid transparent;

    &:hover, &:active {
      color: var(--color-action-hover);
      border-bottom-color: var(--color-background-accent);
    }

    &:active {
      border-bottom-color: var(--color-background-accent-hover);
    }
  }

  background-color: #ffffff;
  &:nth-child(2n+1) { background-color: #f8f8f8; }

  &:hover, &:active {
    background-color: var(--color-background-hover);
    border-color: var(--color-border-hover);
    .title { color: var(--color-title-hover); }
  }

  &:active { background-color: var(--color-background-active); }
}

.hidden {
  opacity: 0;
  visibility: hidden;
}
</style>