<template>
  <h1>Hello, {{ name }}!</h1>
</template>


<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue';
import { helloWorld } from '@/common';

export default defineComponent({
  name: 'Download Box',
  setup() {
    const name = ref('world');

    onMounted(() => helloWorld());

    return {
      name,
    };
  }
});
</script>

<!-- Main 'App' SCSS does not need to be scoped -->
<style lang="scss">
:root {
  font-family: sans-serif;
  font-style: 16px;
  font-weight: 400;
}

body {
  margin: 0;
  padding: 0;
  width: 420px;
  user-select: none;
}
</style>