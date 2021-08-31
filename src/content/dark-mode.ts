const matcher = window.matchMedia('(prefers-color-scheme: dark)');
const onChange = () => chrome.runtime.sendMessage({ scheme: matcher.matches ? 'dark' : 'light' });
matcher.onchange = onChange;

onChange();