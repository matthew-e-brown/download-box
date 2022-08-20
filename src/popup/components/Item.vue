<template>
    <li
        role="button"
        tabindex="0"
        @click="openFile"
        @click.right.stop.prevent="openOverlay"
        class="download-item"
        :class="itemClasses"
    >
        <img
            :src="icon"
            class="icon"
            width="32"
            height="32"
            aria-hidden="true"
            alt=""
        />

        <div class="info">
            <div class="name">{{ filename }}</div>
            <div class="size">
                <div class="file-size">{{ filesize }}</div>
                <template v-if="shouldShowBar || shouldShowResume">
                    <div class="dot">&middot;</div>
                    <div class="down-speed">{{ shouldShowResume ? 'Paused' : downSpeed }}</div>
                    <template v-if="timeRemaining">
                        <div class="dot">&middot;</div>
                        <div class="remaining" v-html="timeRemaining"></div>
                    </template>
                </template>
            </div>
        </div>

        <div class="button-row">
            <!-- Extra resume button -->
            <button
                type="button"
                class="icon-button"
                v-if="shouldShowResume"
                @click.stop="resumeDownload"
            ><FaIcon icon="play" fixed-width /></button>

            <button
                type="button"
                class="icon-button"
                v-if="shouldShowRetry"
                @click.stop="retryDownload"
            ><FaIcon icon="arrow-rotate-left" fixed-width /></button>
            <button
                type="button"
                class="icon-button"
                v-else-if="shouldShowFolder"
                @click.stop="showFile"
            ><FaIcon icon="folder-blank" fixed-width /></button>
        </div>

        <ProgressBar
            v-if="shouldShowBar"
            :percentage="percentage"
            :gradient-start="barColor.start"
            :gradient-end="barColor.end"
        />

        <Transition name="slide-fade">
            <ItemOverlay
                v-if="isOverlayOpen"
                @click.stop="closeOverlay"
            >
                <!-- URL copy button -->
                <button
                    type="button"
                    class="icon-button"
                    @click="copyLink"
                ><fa-icon icon="link" fixed-width /></button>

                <!-- pause/resume button -->
                <button
                    type="button"
                    class="icon-button"
                    v-if="shouldShowResume"
                    @click.stop="resumeDownload"
                ><FaIcon icon="play" fixed-width /></button>
                <button
                    type="button"
                    class="icon-button"
                    v-else-if="shouldShowPause"
                    @click.stop="pauseDownload"
                ><FaIcon icon="pause" fixed-width /></button>

                <!-- Erase button -->
                <button
                    type="button"
                    class="icon-button erase-button"
                    @click="eraseFromList"
                ><fa-icon icon="xmark" fixed-width /></button>
            </ItemOverlay>
        </Transition>

    </li>
</template>


<script setup lang="ts">
import { ref, computed, watch, inject, toRefs } from 'vue';
import { formatSize, computePercentage, DownloadSpeeds } from '@/common';
import { showCopiedKey } from '../main';

import ProgressBar from './ProgressBar.vue';
import ItemOverlay from './ItemOverlay.vue';
import { FontAwesomeIcon as FaIcon } from '@fortawesome/vue-fontawesome';

import downloads = chrome.downloads;
import DownloadItem = downloads.DownloadItem;


// =================================================================================================


const props = defineProps<{
    item: DownloadItem,
    speedsMap?: DownloadSpeeds,
}>();

const emit = defineEmits<{
    (e: 'erase', id: number): void,
    (e: 'retry', url: string): void,
    (e: 'overlay'): void,
}>();


// =================================================================================================


const { item, speedsMap } = toRefs(props);
const showCopied = inject(showCopiedKey);


const showFile = () => downloads.show(item.value.id);
const openFile = () => {
    if (item.value.state == 'complete') downloads.open(item.value.id);
}

const pauseDownload = () => downloads.pause(item.value.id);
const resumeDownload = () => downloads.resume(item.value.id);

const retryDownload = () => emit('retry', item.value.url);
const eraseFromList = () => emit('erase', item.value.id);
const copyLink = async () => {
    await navigator.clipboard.writeText(item.value.finalUrl);
    showCopied?.(); // trigger provided function
}


const isOverlayOpen = ref(false);
const closeOverlay = () => isOverlayOpen.value = false;
const openOverlay = () => {
    isOverlayOpen.value = true;
    emit('overlay');
}


const barColor = computed<{ start: string, end: string }>(() => {
    let cssVarName;

    if (item.value.paused) {
        cssVarName = 'paused';
    } else if (item.value.state == 'interrupted') {
        cssVarName = 'error';
    } else {
        cssVarName = 'normal';
    }

    return {
        start: `var(--progress-bar-${cssVarName}1)`,
        end: `var(--progress-bar-${cssVarName}2)`,
    };
});

const itemClasses = computed(() => ({
    'error': item.value.state == 'interrupted' || !item.value.exists,
    'overlay-open': isOverlayOpen.value,
}));


const shouldShowResume  = computed(() => item.value.canResume);
const shouldShowPause   = computed(() => !shouldShowResume.value && item.value.state == 'in_progress');
const shouldShowRetry   = computed(() => !item.value.exists || item.value.state == 'interrupted');
const shouldShowFolder  = computed(() => item.value.exists);
const shouldShowBar     = computed(() => item.value.state == 'in_progress' || item.value.canResume);


const filename = computed(() => {
    // Full path
    const path = item.value.filename;

    const separator = path.indexOf('/') == -1 ? '\\' : '/';
    const filename = path.substring(path.lastIndexOf(separator) + 1);

    return filename.replace(/\.crdownload$/, '');
});

const percentage = computed(() => {
    if (shouldShowBar.value) {
        const { num, den } = computePercentage(item.value);
        return (den == 0) ? 0 : num / den;
    } else {
        return 1;
    }
});

const filesize = computed(() => {
    if (shouldShowBar.value) {
        const { num, den } = computePercentage(item.value);
        return `${formatSize(num)} / ${formatSize(den)}`;
    } else {
        return formatSize(item.value.fileSize);
    }
});

const downSpeed = computed(() => {
    if (shouldShowBar.value && speedsMap?.value) {
        const speed = speedsMap.value[item.value.id];
        return `${formatSize(speed ?? -1)}/s`;
    } else {
        return `${formatSize(0)}/s`;
    }
});

const timeRemaining = computed(() => {
    if (shouldShowBar.value && speedsMap?.value && !shouldShowResume.value) {
        // Check how much we've downloaded and how much per second we're downloading
        const speed = speedsMap.value[item.value.id];
        const { num, den } = computePercentage(item.value);

        if (num >= den) return;
        if (speed == -1) return;
        if (speed == 0) return '&infin; seconds left';

        // Simply divide the amount they have left by the speed we're going for a rough guess
        const guessSeconds = (den - num) / speed;

        // Format time
        let n, u;
        if (guessSeconds >= 3600 * 99) {
            n = '&gt;99';
            u = 'hour';
        } else if (guessSeconds >= 3600) {
            n = Math.round(guessSeconds / 3600);
            u = 'hour';
        } else if (guessSeconds >= 60) {
            n = Math.round(guessSeconds / 60);
            u = 'min';
        } else {
            n = Math.round(guessSeconds);
            u = 'sec';
        }

        if (n != 1) u += 's';
        return `${n} ${u} left`;
    }
});

// Defaults to a blank, 1x1, transparent `.gif` file (placeholder)
const icon = ref('data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');

// Use a `watch` instead of a regular `computed` because `getFileIcon` is asynchronous
watch(() => item.value.id, async () => {
    const src = await new Promise<string>(resolve => {
        downloads.getFileIcon(item.value.id, { size: 32 }, resolve);
    });

    if (src) icon.value = src;
}, { immediate: true });


defineExpose({
    itemId: computed(() => item.value.id),
    closeOverlay,
});
</script>


<style lang="scss" scoped>
.download-item {
    height: 75px;
    padding: 0 14px;
    position: relative;

    border: 2px solid transparent;
    &:not(.overlay-open):hover {
        border-color: var(--item-border);
        &.error { border-color: var(--item-border-error); }
    }

    display: grid;
    grid-template-rows: 1fr;
    grid-template-columns: 48px minmax(0, 1fr) min-content;
    align-items: center;

    column-gap: 24px;

    background-color: var(--item-bg1);
    &:nth-child(2n+2) { background-color: var(--item-bg2); }

    cursor: pointer;
}

.icon {
    display: block;
    justify-self: center;
}

.name {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    margin-bottom: 4px;
}

.size {
    display: flex;
    flex-flow: row nowrap;
    column-gap: 6px;
    font-size: 12px;
}

.dot {
    opacity: 0.75;
}

.erase-button {
    color: var(--button-warning-fg);
    --button-color: var(--button-warning-bg);
    --border-color: var(--button-warning-border);
}

.error {

    .icon, .name, .size {
        opacity: 0.45;
    }

}

::v-deep(.progress-bar) {
    inset: -2px;
    top: unset;
    width: calc(100% + 4px);
}

.slide-fade-enter-active, .slide-fade-leave-active {
    transition-duration: 125ms;
    transition-timing-function: ease-out;
    transition-property: transform, opacity;
}

.slide-fade-enter-from, .slide-fade-leave-to {
    transform: translateX(10px);
    opacity: 0;
}

.slide-fade-enter-to, .slide-fade-leave-from {
    transform: translateX(0);
    opacity: 1;
}
</style>
