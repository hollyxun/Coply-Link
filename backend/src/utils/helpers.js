import jieba from '@node-rs/jieba';
const { Jieba } = jieba;

// 单例 Jieba 实例，避免重复创建
const jiebaInstance = new Jieba();

/**
 * 分词函数 - 使用 jieba 中文分词
 * 使用 HMM 模式获得更好的分词效果
 */
function tokenize(text) {
  if (!text) return [];

  // jieba 中文分词（HMM 模式，精确分词）
  const tokens = jiebaInstance.cut(text, true);

  // 过滤空白，转小写
  return tokens
    .map(token => token.trim().toLowerCase())
    .filter(token => token.length > 0);
}

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
 * 计算 Dice 相似度系数（词汇集合重叠率）
 * 更适合短文本（标题）的相似度计算
 * Dice = 2 * |A ∩ B| / (|A| + |B|)
 */
function diceSimilarity(tokens1, tokens2) {
  if (tokens1.length === 0 || tokens2.length === 0) return 0;

  const set1 = new Set(tokens1);
  const set2 = new Set(tokens2);

  // 计算交集大小
  const intersection = [...set1].filter(token => set2.has(token)).length;

  // Dice 系数
  const dice = (2 * intersection) / (set1.size + set2.size);

  return Math.round(dice * 100);
}

/**
 * 检查标题是否与已有标题过于相似
 * 使用 jieba 分词 + Dice 系数计算词汇重叠率
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

  // 遍历已有标题计算相似度
  for (const existing of existingTitles) {
    const existingTokens = tokenize(existing);
    if (existingTokens.length === 0) continue;

    const similarity = diceSimilarity(newTokens, existingTokens);
    if (similarity >= threshold) {
      return { similar: true, similarTitle: existing, similarity };
    }
  }

  return { similar: false, similarTitle: null, similarity: 0 };
}