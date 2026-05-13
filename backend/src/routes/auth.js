import { Router } from 'express';
import { ADMIN_PASSWORD, usersRepo } from '../db.js';

export const authRouter = Router();

authRouter.post('/', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    res.json({ success: true });
  } else {
    res.json({ success: false });
  }
});

authRouter.post('/check-username', (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ success: false, message: '用户名不能为空' });
  }
  const user = usersRepo.findByUsername(username);
  res.json({ success: true, exists: !!user });
});

authRouter.post('/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: '参数不全' });
  }
  
  if (usersRepo.findByUsername(username)) {
    return res.status(400).json({ success: false, message: '用户名已存在' });
  }
  
  try {
    usersRepo.create(username, password);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: '注册失败' });
  }
});

authRouter.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: '参数不全' });
  }
  
  const user = usersRepo.findByUsername(username);
  if (user && user.password === password) {
    res.json({ success: true, userId: user.id });
  } else {
    res.status(401).json({ success: false, message: '用户名或密码错误' });
  }
});