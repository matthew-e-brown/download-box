<template>
  <div class="modal">
    <div>{{ text }}</div>
    <button type="button" class="yes" @click="$emit('yes')">Yes</button>
    <button type="button" class="no" @click="$emit('no')">No</button>
  </div>
</template>


<script lang="ts">
import { defineComponent } from 'vue';


export default defineComponent({
  name: 'Modal',
  props: {
    text: {
      type: String,
      default: "Are you sure?",
    }
  },
  emits: [ 'yes', 'no' ],
});
</script>


<style lang="scss" scoped>

</style>


<style lang="scss" scoped>
.modal {
  position: absolute;
  inset: -2px;

  display: grid;
  place-items: stretch;
  grid-template-columns: 1fr 40px;
  grid-template-rows: 1fr 1fr;
  column-gap: 24px;
  row-gap: 5px;

  padding: 5px 14px;
  padding-left: 0;

  background: linear-gradient(to left, black, black 65%, transparent);

  cursor: default;

  div {
    grid-row: 1 / -1;
    place-self: center flex-end;
    text-align: right;
  }

  button {
    color: inherit;
    background-color: var(--button-bg2);

    border: 2px solid transparent;
    &:hover { border-color: var(--accent1); }

    margin: 0;
    padding: 0;
    border-radius: 4px;

    cursor: pointer;
    font-size: 85%;
  }

  button:first-of-type {
    background-color: var(--accent3-bg);
    color: var(--accent3-fg);

    &:hover { border-color: var(--accent3-border); }
  }
}
</style>