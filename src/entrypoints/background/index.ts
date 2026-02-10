import { browser } from '@wxt-dev/webextension-polyfill/browser';

const NOTEBOOK_IFRAME_REGEX = /https:\/\/.*\.usercontent\.goog\/.*shim\.html/i;

function shouldHandleFrame(url: string | undefined, frameId: number) {
  if (frameId <= 0 || !url) return false;
  return url.startsWith('blob:https://') || NOTEBOOK_IFRAME_REGEX.test(url);
}

function extractNotebookData() {
  const dataElement = document.body.querySelector('app-root');
  if (!dataElement) return;

  const data = dataElement.getAttribute('data-app-data');
  if (!data || typeof data !== 'string') return;

  window.parent.postMessage(
    {
      type: 'NOTEBOOKLM_DATA',
      data,
    },
    '*'
  );
}

const firefoxInjectionSource = `(${extractNotebookData.toString()})();`;

let backgroundEntrypoint;

if (import.meta.env.FIREFOX) {
  backgroundEntrypoint = defineBackground(() => {
    console.log('[AnkiNLM] Firefox background ready');

    if (!browser.webNavigation) {
      console.error('[AnkiNLM] browser.webNavigation is unavailable');
      return;
    }

    browser.webNavigation.onCommitted.addListener(async (details) => {
      if (!shouldHandleFrame(details.url, details.frameId)) return;

      try {
        await browser.tabs.executeScript(details.tabId, {
          frameId: details.frameId,
          matchAboutBlank: true,
          runAt: 'document_idle',
          code: firefoxInjectionSource,
        });
      } catch (error) {
        console.error('[AnkiNLM] Failed to inject into Firefox frame', error);
      }
    });
  });
} else {
  backgroundEntrypoint = defineBackground(() => {
    console.log('[AnkiNLM] Chromium background ready');

    if (!chrome.webNavigation) {
      console.error('[AnkiNLM] chrome.webNavigation is unavailable');
      return;
    }

    chrome.webNavigation.onCommitted.addListener(async (details) => {
      if (!shouldHandleFrame(details.url, details.frameId)) return;
      try {
        await chrome.scripting.executeScript({
          target: {
            tabId: details.tabId,
            frameIds: [details.frameId],
            matchOriginAsFallback: true,
          } as chrome.scripting.InjectionTarget & { matchOriginAsFallback: boolean },
          func: extractNotebookData,
        });
      } catch (error) {
        console.error('[AnkiNLM] Failed to inject into Chromium frame', error);
      }
    });
  });
}

export default backgroundEntrypoint;
