<template>
  <div
    class="modal"
    @click.self="$emit('no')"
  >
    <button
      type="button"
      class="icon-button"
      @click="$emit('yes')"
    ><fa-icon icon="xmark" fixed-width /></button>
  </div>
</template>


<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'Modal',
  emits: [ 'yes', 'no' ],
});
</script>


<style lang="scss" scoped>
.modal {
  position: absolute;
  inset: -2px;
  padding-right: 16px;

  display: flex;
  align-items: center;
  justify-content: flex-end;


  background: linear-gradient(to left, var(--modal-bg), var(--modal-bg) 35%, transparent);

  cursor: default;

  button {
    color: var(--button-confirm-fg);
    --button-color: var(--button-confirm-bg);
    --border-color: var(--button-confirm-border);
    padding: 0;
  }
}
</style>