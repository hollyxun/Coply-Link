import jieba from '@node-rs/jieba';
import natural from 'natural';
const { Jieba } = jieba;
const { DiceCoefficient } = natural;

// 单例实例
const jiebaInstance = new Jieba();

/**
 * 分词函数 - 使用 jieba 中文分词（HMM 精确模式）
 */
function tokenize(text) {
  if (!text) return [];

  const tokens = jiebaInstance.cut(text, true);

  return tokens
    .map(token => token.trim().toLowerCase())
    .filter(token => token.length > 0);
}

/**
 * 检查标题是否与已有标题过于相似
 * 使用 jieba 分词 + natural DiceCoefficient
 * @param title 新标题
 * @param existingTitles 已有标题列表
 * @param threshold 相似度阈值（百分比）
 * @returns { similar: boolean, similarTitle: string|null, similarity: number }
 */
export function checkTitleSimilarity(title, existingTitles, threshold = 70) {
  if (!title || existingTitles.length === 0) {
    return { similar: false, similarTitle: null, similarity: 0 };
  }

  // 完全相同直接返回
  if (existingTitles.includes(title)) {
    return { similar: true, similarTitle: title, similarity: 100 };
  }

  // 分词：新标题
  const newTokens = tokenize(title);
  if (newTokens.length === 0) {
    return { similar: false, similarTitle: null, similarity: 0 };
  }

  // 转为空格分隔的字符串供 DiceCoefficient 使用
  const newText = newTokens.join(' ');

  // 遍历已有标题计算相似度
  for (const existing of existingTitles) {
    const existingTokens = tokenize(existing);
    if (existingTokens.length === 0) continue;

    const existingText = existingTokens.join(' ');

    // 使用 natural 的 DiceCoefficient
    const similarity = DiceCoefficient(newText, existingText);

    // 转为百分比
    const similarityPercent = Math.round(similarity * 100);

    if (similarityPercent >= threshold) {
      return { similar: true, similarTitle: existing, similarity: similarityPercent };
    }
  }

  return { similar: false, similarTitle: null, similarity: 0 };
}

/**
 * 获取客户端真实IP，兼容IPv4、IPv6、代理等情况
 */
export function getClientIp(req) {
  const headers = [
    'x-forwarded-for',
    'x-real-ip',
    'cf-connecting-ip',
    'true-client-ip',
    'x-client-ip',
    'x-cluster-client-ip',
  ];

  for (const header of headers) {
    const value = req.headers[header];
    if (value) {
      const ip = value.split(',')[0].trim();
      if (ip && ip !== 'unknown') {
        return normalizeIp(ip);
      }
    }
  }

  const remoteAddress = req.socket?.remoteAddress;
  if (remoteAddress) {
    return normalizeIp(remoteAddress);
  }

  return 'unknown';
}

/**
 * 规范化IP地址
 */
export function normalizeIp(ip) {
  if (!ip || ip === 'unknown') {
    return 'unknown';
  }

  if (ip.startsWith('::ffff:')) {
    ip = ip.slice(7);
  }

  if (ip === '::1' || ip === '127.0.0.1' || ip === 'localhost') {
    return 'localhost';
  }

  if (ip.includes(':')) {
    try {
      const segments = ip.toLowerCase().split(':');
      const doubleColonIndex = segments.indexOf('');
      if (doubleColonIndex !== -1) {
        const left = segments.slice(0, doubleColonIndex);
        const right = segments.slice(doubleColonIndex + 1);
        const missingCount = 8 - left.length - right.length;
        const expanded = [...left, ...Array(missingCount).fill('0'), ...right];
        return expanded.map(s => s.replace(/^0+/, '') || '0').join(':');
      }
      return segments.map(s => s.replace(/^0+/, '') || '0').join(':');
    } catch {
      return ip.toLowerCase();
    }
  }

  return ip;
}

/**
 * 获取今日日期字符串 (YYYY-MM-DD)
 */
export function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

/**
 * 获取北京时间的 ISO 格式字符串 (YYYY-MM-DD HH:mm:ss)
 */
export function getBeijingTime() {
  const now = new Date();
  const beijingOffset = 8 * 60 * 60 * 1000;
  const beijingTime = new Date(now.getTime() + beijingOffset);
  return beijingTime.toISOString().slice(0, 19).replace('T', ' ');
}