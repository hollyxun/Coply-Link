import FingerprintJS from '@fingerprintjs/fingerprintjs';

export const API = import.meta.env.DEV ? 'http://localhost:3818/api' : '/api';

let fpPromise = null;
let cachedFingerprint = null;

export async function getFingerprint() {
  if (cachedFingerprint) {
    return cachedFingerprint;
  }

  if (!fpPromise) {
    fpPromise = FingerprintJS.load();
  }

  const fp = await fpPromise;
  const result = await fp.get();
  cachedFingerprint = result.visitorId;
  return cachedFingerprint;
}

export function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export async function copyToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fallback below
    }
  }

  if (document.execCommand) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '0';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    try {
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      return success;
    } catch {
      document.body.removeChild(textarea);
    }
  }

  const range = document.createRange();
  const span = document.createElement('span');
  span.textContent = text;
  span.style.position = 'fixed';
  span.style.left = '-9999px';
  span.style.opacity = '0';
  document.body.appendChild(span);
  range.selectNode(span);

  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);

  try {
    document.execCommand('copy');
    document.body.removeChild(span);
    selection?.removeAllRanges();
    return true;
  } catch {
    document.body.removeChild(span);
    selection?.removeAllRanges();
    return false;
  }
}

export async function requestJson(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`request failed: ${response.status}`);
  }
  return response.json();
}

export function buildEditForm(link) {
  return {
    title: link.title,
    url: link.url,
    description: link.description || '',
  };
}

export function jumpToApp(text) {
  if (!text) return;

  // 尝试从文本中提取真正的 HTTP/HTTPS 链接（防止带有“点击打开”等其他文字内容）
  const urlMatch = text.match(/https?:\/\/[^\s]+/i);
  const cleanUrl = urlMatch ? urlMatch[0] : text;

  let schemeUrl = '';

  if (!/^https?:\/\//i.test(cleanUrl)) {
    schemeUrl = cleanUrl;
  } else {
    const lowerUrl = cleanUrl.toLowerCase();
    if (lowerUrl.includes('taobao.com') || lowerUrl.includes('tb.cn') || lowerUrl.includes('tmall.com')) {
      schemeUrl = cleanUrl.replace(/^https?:\/\//i, 'taobao://');
    }
  }

  if (!schemeUrl) return;

  console.log('[App Jump] Target Scheme URL:', schemeUrl);

  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  const isAndroid = /android/i.test(userAgent);
  const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;

  if (isAndroid) {
    // Android 高版本兼容方案：使用 intent:// 协议
    const match = schemeUrl.match(/^([a-zA-Z0-9-]+):\/\/(.*)$/);
    if (match) {
      const scheme = match[1];
      const path = match[2];
      let intentUrl = `intent://${path}#Intent;scheme=${scheme};`;
      if (scheme === 'taobao') {
        intentUrl += 'package=com.taobao.taobao;';
      }
      // 不添加 fallback_url，保证在没装 APP 时能够静默处理而不覆盖当前 H5 页面报错
      intentUrl += 'end;';
      window.location.href = intentUrl;
    } else {
      window.location.href = schemeUrl;
    }
  } else if (isIOS) {
    // iOS Safari 推荐直接 href 跳转，未安装 APP 仅会系统弹窗提示，不会覆盖当前路由
    window.location.href = schemeUrl;
  } else {
    // 其他平台使用 iframe 保底方案
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = schemeUrl;
    document.body.appendChild(iframe);
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 1000);
  }
}
