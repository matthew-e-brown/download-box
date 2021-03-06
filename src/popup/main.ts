import App from './App.vue';
import { createApp, InjectionKey } from 'vue';

import { library } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';

import 'normalize.css';
import '@fontsource/atkinson-hyperlegible/400.css';

import './main.scss';


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


export const popupKey = Symbol('Popup') as InjectionKey<() => void>;


export default createApp(App)
  .component('fa-icon', FontAwesomeIcon)
  .mount('#app');
