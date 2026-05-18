import { Router } from 'express';
import { DAILY_LIMIT, linksRepo, submissionRepo } from '../db.js';
import { getClientIp, getTodayDate, checkTitleSimilarity } from '../utils/helpers.js';
import { isSafeUrl } from '../middleware/xssSanitizer.js';

export const linksRouter = Router();

// ============================================================================
// 公共接口（无需认证）
// ============================================================================

/**
 * GET /links
 * 获取所有链接列表
 *
 * 调用方：ViewPage（首页）、AdminPage（管理页）
 * 响应：Link[]
 */
linksRouter.get('/', (req, res) => {
  res.json(linksRepo.findAll());
});

/**
 * POST /links/:id/click
 * 点击计数（每次复制时调用）
 *
 * 调用方：ViewPage.handleCopy
 * 参数：无
 * 响应：{ clicks: number }
 */
linksRouter.post('/:id/click', (req, res) => {
  res.json(linksRepo.click(req.params.id));
});

// ============================================================================
// 用户接口（基于 fingerprint + IP 认证）
// ============================================================================

/**
 * POST /links/my-links
 * 获取当前用户提交的链接（用于"我的提交"区块）
 *
 * 调用方：ViewPage.loadInitialData、ViewPage.loadLinks
 * 参数：{ fingerprint: string }
 * 响应：Link[]
 */
linksRouter.post('/my-links', (req, res) => {
  const { fingerprint } = req.body;
  const ip = getClientIp(req);

  if (!fingerprint) {
    return res.status(400).json({ error: '缺少指纹标识' });
  }

  const links = linksRepo.findByOwner(fingerprint, ip);
  res.json(links);
});

/**
 * POST /links/submission-count
 * 获取今日提交次数（用于显示剩余次数）
 *
 * 调用方：ViewPage.loadInitialData
 * 参数：{ fingerprint: string }
 * 响应：{ count: number, limit: number, remaining: number }
 */
linksRouter.post('/submission-count', (req, res) => {
  const { fingerprint } = req.body;
  const ip = getClientIp(req);

  if (!fingerprint) {
    return res.status(400).json({ error: '缺少指纹标识' });
  }

  const today = getTodayDate();
  const count = submissionRepo.getCount(fingerprint, ip, today);
  const remaining = DAILY_LIMIT - count;

  res.json({
    count,
    limit: DAILY_LIMIT,
    remaining,
  });
});

/**
 * POST /links/public
 * 公共提交链接（受每日次数限制）
 *
 * 调用方：ViewPage.handleSubmitPublic
 * 参数：{ fingerprint: string, title: string, url: string, description?: string }
 * 响应：{ success: true, ...Link, remaining: number }
 * 错误：400 标题/URL无效、标题相似度过高；429 次数用尽
 */
linksRouter.post('/public', (req, res) => {
  const { fingerprint, title, url, description } = req.body;
  const ip = getClientIp(req);

  if (!fingerprint) {
    return res.status(400).json({ success: false, error: '缺少指纹标识' });
  }

  if (!title) {
    return res.status(400).json({ success: false, error: '标题不能为空' });
  }

  if (!url || !isSafeUrl(url)) {
    return res.status(400).json({ success: false, error: 'URL 格式不正确或包含不安全协议' });
  }

  // 检查标题相似度
  const existingTitles = linksRepo.findAllTitles();
  const similarityCheck = checkTitleSimilarity(title, existingTitles, 7);
  if (similarityCheck.similar) {
    return res.status(400).json({
      success: false,
      error: `标题与已有链接「${similarityCheck.similarTitle}」过于相似（${similarityCheck.similarity.toFixed(1)}%）`,
    });
  }

  const today = getTodayDate();
  const count = submissionRepo.getCount(fingerprint, ip, today);

  if (count >= DAILY_LIMIT) {
    return res.status(429).json({
      success: false,
      error: '今日提交次数已达上限',
      count,
      limit: DAILY_LIMIT,
    });
  }

  const link = linksRepo.create(title, url, description, fingerprint, ip);
  submissionRepo.incrementOrCreate(fingerprint, ip, today);

  res.json({
    success: true,
    ...link,
    remaining: DAILY_LIMIT - count - 1,
  });
});

/**
 * PUT /links/public/:id
 * 公共修改链接（仅限自己提交的）
 *
 * 调用方：ViewPage.handleSubmitPublic（编辑模式）
 * 参数：{ fingerprint: string, title: string, url: string, description?: string }
 * 响应：{ success: true }
 * 错误：403 非自己的链接
 */
linksRouter.put('/public/:id', (req, res) => {
  const { fingerprint, title, url, description } = req.body;
  const ip = getClientIp(req);

  if (!fingerprint) {
    return res.status(400).json({ success: false, error: '缺少指纹标识' });
  }

  if (url && !isSafeUrl(url)) {
    return res.status(400).json({ success: false, error: 'URL 格式不正确或包含不安全协议' });
  }

  const result = linksRepo.updateByOwner(req.params.id, title, url, description, fingerprint, ip);

  if (!result.success) {
    return res.status(403).json({ success: false, error: '只能修改自己提交的链接' });
  }

  res.json({ success: true });
});

/**
 * DELETE /links/public/:id
 * 公共删除链接（仅限自己提交的）
 *
 * 调用方：ViewPage.handleDeleteMyLink
 * 参数：{ fingerprint: string }
 * 响应：{ success: true }
 * 错误：403 非自己的链接
 */
linksRouter.delete('/public/:id', (req, res) => {
  const { fingerprint } = req.body;
  const ip = getClientIp(req);

  if (!fingerprint) {
    return res.status(400).json({ success: false, error: '缺少指纹标识' });
  }

  const result = linksRepo.deleteByOwner(req.params.id, fingerprint, ip);

  if (!result.success) {
    return res.status(403).json({ success: false, error: '只能删除自己提交的链接' });
  }

  res.json({ success: true });
});

// ============================================================================
// 管理员接口（需要 password 认证）
// ============================================================================

/**
 * POST /links
 * 管理员添加链接（无次数限制，无 fingerprint）
 *
 * 调用方：AdminPage.handleSubmit、AdminPage.handleImport
 * 参数：{ password: string, title: string, url: string, description?: string }
 * 响应：Link
 * 错误：401 密码错误
 */
linksRouter.post('/', (req, res) => {
  const { password, title, url, description } = req.body;

  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, error: '需要管理员密码' });
  }

  if (!url || !isSafeUrl(url)) {
    return res.status(400).json({ success: false, error: 'URL 格式不正确或包含不安全协议' });
  }

  const link = linksRepo.create(title, url, description, null, null);
  res.json(link);
});

/**
 * PUT /links/:id
 * 管理员更新链接
 *
 * 调用方：AdminPage.handleSubmit（编辑模式）
 * 参数：{ password: string, title: string, url: string, description?: string }
 * 响应：{ success: true }
 * 错误：401 密码错误
 */
linksRouter.put('/:id', (req, res) => {
  const { password, title, url, description } = req.body;

  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, error: '需要管理员密码' });
  }

  if (url && !isSafeUrl(url)) {
    return res.status(400).json({ success: false, error: 'URL 格式不正确或包含不安全协议' });
  }

  res.json(linksRepo.update(req.params.id, title, url, description));
});

/**
 * DELETE /links/batch
 * 管理员批量删除链接
 * 注意：必须放在 DELETE /:id 之前，避免被参数路由拦截
 *
 * 调用方：AdminPage.handleBatchDelete
 * 参数：{ password: string, ids: number[] }
 * 响应：{ success: true, deletedCount: number, requestedCount: number }
 * 错误：401 密码错误
 */
linksRouter.delete('/batch', (req, res) => {
  const { password, ids } = req.body;

  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, error: '需要管理员密码' });
  }

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ success: false, error: '缺少要删除的链接ID列表' });
  }

  let deletedCount = 0;
  for (const id of ids) {
    try {
      linksRepo.delete(id);
      deletedCount++;
    } catch {
      // 单条删除失败时继续执行
    }
  }

  res.json({ success: true, deletedCount, requestedCount: ids.length });
});

/**
 * DELETE /links/:id
 * 管理员删除单条链接
 *
 * 调用方：AdminPage.handleDelete
 * 参数：{ password: string }
 * 响应：{ success: true }
 * 错误：401 密码错误
 */
linksRouter.delete('/:id', (req, res) => {
  const { password } = req.body;

  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, error: '需要管理员密码' });
  }

  res.json(linksRepo.delete(req.params.id));
});