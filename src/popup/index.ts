import Popup from './Popup.svelte';
import './main.scss';

// @ts-ignore
window.bodyText = chrome.i18n.getMessage;

chrome.runtime.sendMessage('downloader_popup_opened');

export default new Popup({ target: document.body });