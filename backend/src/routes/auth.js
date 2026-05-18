import { Router } from 'express';
import { ADMIN_PASSWORD } from '../db.js';

export const authRouter = Router();

/**
 * POST /auth
 * 管理员密码验证
 *
 * 调用方：AdminPage.handleAuth
 * 参数：{ password: string }
 * 响应：{ success: true } 或 { success: false }
 */
authRouter.post('/', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    res.json({ success: true });
  } else {
    res.json({ success: false });
  }
});