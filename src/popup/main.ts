import App from './App.vue';
import { createApp, InjectionKey } from 'vue';

import { library } from '@fortawesome/fontawesome-svg-core';

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


export const showCopiedKey = Symbol('Popup') as InjectionKey<() => void>;


export default createApp(App).mount('#app');
