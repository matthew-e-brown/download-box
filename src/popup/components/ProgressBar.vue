<template>
    <svg
        xmlns="http://www.w3.org/2000/svg"
        version="1.1"
        viewbox="0 0 440 5"
        role="progressbar"
        aria-valuemin="0"
        aria-valuemax="1"
        :aria-valuenow="percentage"
        class="progress-bar"
    >
        <defs>
            <mask :id="`bar-mask-${key}`">
                <rect fill="black" x="0" y="0" width="100%" height="100%" />
                <path fill="white" :d="pathMask" />
            </mask>

            <linearGradient :id="`bar-gradient-${key}`">
                <stop offset="0%"  :stop-color="gradientStart" />
                <stop offset="60%" :stop-color="gradientEnd" />
            </linearGradient>
        </defs>

        <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            :mask="`url(#bar-mask-${key})`"
            :fill="`url(#bar-gradient-${key})`"
        />
    </svg>
</template>


<script setup lang="ts">
import { computed, toRefs } from 'vue';

interface Props {
    gradientStart: string,
    gradientEnd: string,
    percentage: number,
}

// =================================================================================================

const { percentage } = toRefs(withDefaults(defineProps<Props>(), {
    gradientStart: 'white',
    gradientEnd: 'black',
}));

const key = '0123456789abcdef'.replace(/./g, () => (~~(Math.random() * 16)).toString(16));

const pathMask = computed(() => {
    // https://yqnn.github.io/svg-path-editor/
    if (percentage.value == 0) return 'M 0 0 Z';
    else {
        // SVG's viewport is 440 to get the right ratio, then shaped with CSS afterwards.
        // Hence the 440 multiple.
        const width = percentage.value * 440;
        return `m 0 0 l ${width} 0 a 1 1 0 0 1 0 5 L 0 5 z`;
    }
});
</script>


<style lang="scss" scoped>
.progress-bar {
    position: absolute;
    width: 100%;
    height: 5px;
}
</style>
