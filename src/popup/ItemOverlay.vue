<template>
  <div class="modal button-row"><slot /></div>
</template>

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
}
</style>