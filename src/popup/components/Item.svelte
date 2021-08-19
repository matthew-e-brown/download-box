<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  // A blank, 1x1, transparent .gif file to use as a placeholder 'src' attribute
  const emptyGIF = `data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7`;

  // @ts-ignore beacuse TS doesn't seem to recognize experimental new UA testing
  const showIn = (navigator.userAgentData)           // @ts-ignore next line too
    ? /mac/i.test(navigator.userAgentData.platform) ? 'Finder' : 'folder'
    : /mac/i.test(navigator.platform) ? 'Finder' : 'folder';

  const dispatch = createEventDispatcher<{ 'erase': number }>();

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

    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${s[i]}`;
  }

  const open = () => chrome.downloads.open(item.id);
  const show = () => chrome.downloads.show(item.id);
  const erase = () => dispatch('erase', item.id);

  // ===== Reactive =====

  let title: string = '';
  let bytes: string = '? Bytes';
  let image: string = emptyGIF;

  $: {
    title = basename(item.filename);
    bytes = formatSize(item.fileSize);
    image = emptyGIF; // set to blank while the new one loads
    chrome.downloads.getFileIcon(item.id, { size: 32 }, src => {
      image = (src || emptyGIF);
    });
  }
</script>

<li class="box download">
  <img src={image} width="32" height="32" alt="" aria-hidden="true" />

  <div class="body" role="button" on:click={open}>

    <span class="title">{ title }</span>

    <div class="controls">
      <span class="file-size">{ bytes }</span>
      <span class="show-file" role="button" on:click|stopPropagation={show}>
        Show in { showIn }
      </span>
      <span class="rm-file" role="button" on:click|stopPropagation={erase}>
        Remove from list
      </span>
    </div>

  </div>
</li>

<style lang="scss">
.download {
  display: grid;
  grid-template-columns: 4em 1fr;
}
</style>