import { Router } from 'express';
import { linksRepo, submissionRepo, usersRepo } from '../db.js';
import { getClientIp, getTodayDate } from '../utils/helpers.js';
import { isSafeUrl } from '../middleware/xssSanitizer.js';

export const linksRouter = Router();

// 获取所有链接
linksRouter.get('/', (req, res) => {
  res.json(linksRepo.findAll());
});

// 获取用户自己提交的链接
linksRouter.post('/my-links', (req, res) => {
  const { fingerprint } = req.body;
  const ip = getClientIp(req);

  if (!fingerprint) {
    return res.status(400).json({ error: '缺少指纹标识' });
  }

  const links = linksRepo.findByOwner(fingerprint, ip);
  res.json(links);
});

// 获取今日提交次数（fingerprint + IP 组合）
linksRouter.post('/submission-count', (req, res) => {
  const { fingerprint } = req.body;
  const ip = getClientIp(req);

  if (!fingerprint) {
    return res.status(400).json({ error: '缺少指纹标识' });
  }

  res.json({
    count: 0,
    limit: 9999,
    remaining: 9999,
  });
});

// 公共提交链接（每个用户仅限一条，新的替换旧的）
linksRouter.post('/public', (req, res) => {
  const { title, url, description, username } = req.body;

  if (!username) {
    return res.status(401).json({ success: false, error: '请先登录' });
  }

  if (!url || !isSafeUrl(url)) {
    return res.status(400).json({ success: false, error: 'URL 格式不正确或包含不安全协议' });
  }

  const user = usersRepo.findByUsername(username);
  if (!user) {
    return res.status(401).json({ success: false, error: '用户不存在' });
  }

  const link = linksRepo.create(title, url, description, fingerprint, ip);
  submissionRepo.incrementOrCreate(fingerprint, ip, today);

  res.json({
    success: true,
    ...link,
    remaining: DAILY_LIMIT - count - 1,
  });
});

// 公共修改链接（仅限自己的链接）
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

// 公共删除链接（仅限自己的链接）
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

// 管理员提交链接
linksRouter.post('/admin', (req, res) => {
  const { password, title, url, description } = req.body;

  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, error: '密码错误' });
  }

  if (!url || !isSafeUrl(url)) {
    return res.status(400).json({ success: false, error: 'URL 格式不正确或包含不安全协议' });
  }

  const link = linksRepo.create(title, url, description, null, null);
  res.json({ success: true, ...link });
});

// 管理台添加链接
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

// 管理员更新链接
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

// 管理员删除链接
linksRouter.delete('/:id', (req, res) => {
  const { password } = req.body;

  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, error: '需要管理员密码' });
  }

  res.json(linksRepo.delete(req.params.id));
});

// 点击计数
linksRouter.post('/:id/click', (req, res) => {
  res.json(linksRepo.click(req.params.id));
});