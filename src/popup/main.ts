import App from './App.vue';
import { createApp } from 'vue';

import { Message } from '@/common';

import 'normalize.css';
import '@fontsource/atkinson-hyperlegible/400.css';
import './main.scss';

import { library } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';

import {
  faLeft,
  faRight,
  faFolderBlank,
  faArrowRotateLeft,
  faPlay,
  faPause,
  faXmark,
  faLink,
} from '@fortawesome/pro-solid-svg-icons';

library.add(
  faLeft,
  faRight,
  faFolderBlank,
  faArrowRotateLeft,
  faPlay,
  faPause,
  faXmark,
  faLink,
);


export default createApp(App)
  .component('fa-icon', FontAwesomeIcon)
  .mount('#app');