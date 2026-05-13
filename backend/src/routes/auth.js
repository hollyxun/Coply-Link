import { Router } from 'express';
import { ADMIN_PASSWORD } from '../db.js';

export const authRouter = Router();

// 管理员密码验证
authRouter.post('/', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    res.json({ success: true });
  } else {
    res.json({ success: false });
  }
});