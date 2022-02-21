<template>
  <div class="overlay button-row"><slot /></div>
</template>

<style lang="scss" scoped>
.overlay {
  position: absolute;
  inset: -2px;
  padding-right: 16px;

  display: flex;
  align-items: center;
  justify-content: flex-end;


  background: linear-gradient(to left, var(--overlay-bg), var(--overlay-bg) 35%, transparent);

  cursor: default;
}
</style>