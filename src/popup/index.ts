import Popup from './Popup.svelte';
import './main.scss';

// @ts-ignore
window.bodyText = chrome.i18n.getMessage;

export default new Popup({ target: document.body });