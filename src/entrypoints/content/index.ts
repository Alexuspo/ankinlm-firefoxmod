import { createCsvBlob, createCsvString } from '@/utils/utils';

const contentScriptEntrypoint = defineContentScript({
  matches: ['https://notebooklm.google.com/*'],
  allFrames: true,
  main() {
    let lastData: string | null = null;
    let toolbar: HTMLDivElement | null = null;

    window.addEventListener('message', (event) => {
      if (event.data?.type !== 'NOTEBOOKLM_DATA' || typeof event.data.data !== 'string') return;
      lastData = event.data.data;
      ensureToolbar();
    });

    function ensureToolbar() {
      if (toolbar || !lastData) return;

      toolbar = document.createElement('div');
      toolbar.style.position = 'fixed';
      toolbar.style.right = '24px';
      toolbar.style.bottom = '24px';
      toolbar.style.zIndex = '99999';
      toolbar.style.display = 'flex';
      toolbar.style.gap = '8px';
      toolbar.style.padding = '8px 12px';
      toolbar.style.borderRadius = '999px';
      toolbar.style.background = '#202124';
      toolbar.style.boxShadow = '0 2px 8px rgba(0,0,0,0.4)';
      toolbar.style.color = '#fff';
      toolbar.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

      const copyBtn = document.createElement('button');
      copyBtn.textContent = 'Copy CSV';
      styleToolbarButton(copyBtn);
      copyBtn.addEventListener('click', async () => {
        if (!lastData) return;
        const csv = createCsvString(lastData);
        if (!csv) return;
        try {
          await navigator.clipboard.writeText(csv);
        } catch (e) {
          console.error('[AnkiNLM] Failed to copy CSV', e);
        }
      });

      const downloadBtn = document.createElement('button');
      downloadBtn.textContent = 'Download CSV';
      styleToolbarButton(downloadBtn);
      downloadBtn.addEventListener('click', () => {
        if (!lastData) return;
        const blob = createCsvBlob(lastData);
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'flashcards.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      });

      toolbar.appendChild(copyBtn);
      toolbar.appendChild(downloadBtn);

      document.body.appendChild(toolbar);
    }

    function styleToolbarButton(button: HTMLButtonElement) {
      button.style.border = '1px solid #5f6368';
      button.style.background = '#303134';
      button.style.color = '#fff';
      button.style.borderRadius = '999px';
      button.style.padding = '4px 10px';
      button.style.fontSize = '12px';
      button.style.cursor = 'pointer';
    }
  },
});

export default contentScriptEntrypoint;
