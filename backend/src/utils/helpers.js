/**
 * 获取客户端真实IP，兼容IPv4、IPv6、代理等情况
 */
export function getClientIp(req) {
  // 优先从代理头获取
  const headers = [
    'x-forwarded-for',
    'x-real-ip',
    'cf-connecting-ip',      // Cloudflare
    'true-client-ip',        // Akamai
    'x-client-ip',
    'x-cluster-client-ip',
  ];

  for (const header of headers) {
    const value = req.headers[header];
    if (value) {
      // x-forwarded-for 可能包含多个IP，取第一个
      const ip = value.split(',')[0].trim();
      if (ip && ip !== 'unknown') {
        return normalizeIp(ip);
      }
    }
  }

  // 从socket获取
  const remoteAddress = req.socket?.remoteAddress;
  if (remoteAddress) {
    return normalizeIp(remoteAddress);
  }

  return 'unknown';
}

/**
 * 规范化IP地址
 * - 去除IPv6映射前缀 (::ffff:)
 * - 处理localhost (::1, 127.0.0.1)
 * - 保持IPv6完整格式
 */
export function normalizeIp(ip) {
  if (!ip || ip === 'unknown') {
    return 'unknown';
  }

  // 去除IPv6映射IPv4的前缀
  if (ip.startsWith('::ffff:')) {
    ip = ip.slice(7);
  }

  // localhost统一处理
  if (ip === '::1' || ip === '127.0.0.1' || ip === 'localhost') {
    return 'localhost';
  }

  // IPv6地址转小写，去除多余零
  if (ip.includes(':')) {
    // 简化IPv6地址格式（去除前导零等）
    try {
      const segments = ip.toLowerCase().split(':');
      // 处理 :: 简写
      const doubleColonIndex = segments.indexOf('');
      if (doubleColonIndex !== -1) {
        const left = segments.slice(0, doubleColonIndex);
        const right = segments.slice(doubleColonIndex + 1);
        const missingCount = 8 - left.length - right.length;
        const expanded = [...left, ...Array(missingCount).fill('0'), ...right];
        // 去除前导零并重新组合
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
  // 北京时间 = UTC + 8小时
  const beijingOffset = 8 * 60 * 60 * 1000;
  const beijingTime = new Date(now.getTime() + beijingOffset);
  return beijingTime.toISOString().slice(0, 19).replace('T', ' ');
}

/**
 * 计算两个字符串的相似度 (Levenshtein距离)
 * 返回相似度百分比 (0-100)
 */
export function calculateSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  if (str1 === str2) return 100;

  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  const len1 = s1.length;
  const len2 = s2.length;

  if (len1 === 0 || len2 === 0) return 0;

  // Levenshtein距离算法
  const matrix = [];

  for (let i = 0; i <= len2; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len1; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len2; i++) {
    for (let j = 1; j <= len1; j++) {
      if (s2[i - 1] === s1[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  const distance = matrix[len2][len1];
  const maxLen = Math.max(len1, len2);
  const similarity = ((maxLen - distance) / maxLen) * 100;

  return similarity;
}

/**
 * 检查标题是否与已有标题过于相似
 * @param title 新标题
 * @param existingTitles 已有标题列表
 * @param threshold 相似度阈值（百分比）
 * @returns { similar: boolean, similarTitle: string|null, similarity: number }
 */
export function checkTitleSimilarity(title, existingTitles, threshold = 7) {
  for (const existing of existingTitles) {
    const similarity = calculateSimilarity(title, existing);
    if (similarity >= threshold) {
      return { similar: true, similarTitle: existing, similarity };
    }
  }
  return { similar: false, similarTitle: null, similarity: 0 };
}