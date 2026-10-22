const OFFSCREEN_DOCUMENT_PATH = 'offscreen/offscreen.html';

let _offscreenIframe = null;
let _offscreenIframeReady = null;

export async function ensureOffscreenDocument() {
    if (typeof document !== 'undefined') {
        if (_offscreenIframe) return true;
        if (_offscreenIframeReady) return _offscreenIframeReady;

        _offscreenIframeReady = new Promise((resolve) => {
            try {
                const iframe = document.createElement('iframe');
                iframe.src = chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH);
                iframe.style.cssText = 'position:fixed;width:0;height:0;border:0;visibility:hidden;';
                iframe.onload = () => { _offscreenIframe = iframe; resolve(true); };
                iframe.onerror = () => resolve(false);
                (document.body || document.documentElement).appendChild(iframe);
            } catch (e) {
                console.warn('FP Tools: не удалось создать iframe для парсера:', e && e.message);
                resolve(false);
            }
        });
        return _offscreenIframeReady;
    }

    try {
        const existingContexts = await chrome.runtime.getContexts({
            contextTypes: ['OFFSCREEN_DOCUMENT'],
            documentUrls: [chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH)]
        });
        if (existingContexts.length) return true;
        await chrome.offscreen.createDocument({
            url: OFFSCREEN_DOCUMENT_PATH,
            reasons: ['DOM_PARSER'],
            justification: 'Keepalive + parsing FunPay page HTML',
        });
        return true;
    } catch (e) {
        if (String(e && e.message || '').includes('Only a single offscreen')) return true;
        console.warn('FP Tools: не удалось создать offscreen-документ:', e && e.message);
        return false;
    }
}

export async function parseHtmlViaOffscreen(html, action, extra = {}) {
    await ensureOffscreenDocument();
    return await chrome.runtime.sendMessage({
        target: 'offscreen',
        action,
        html,
        ...extra
    });
}