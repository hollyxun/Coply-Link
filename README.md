# Coply Link - 每日互助链接池

轻量级链接分享系统，每日凌晨自动清空，支持自助提交与管理员提交，采用浏览器指纹+IP组合限制防止滥用。

## 功能特性

- **每日重置** - 凌晨0:01自动清空所有链接，确保内容新鲜
- **自助提交** - 用户可直接提交链接，无需登录
- **自主编辑** - 用户可修改/删除自己提交的链接（通过指纹+IP识别）
- **组合限制** - 浏览器指纹 + IP 组合校验，同一设备+网络每日最多3次
- **标题检测** - 提交时检测标题相似度，7%以上不允许添加（防止重复）
- **时间显示** - 显示链接提交时间（年/月/日 时:分格式）
- **复制记录** - 已复制链接自动沉底，localStorage持久记录
- **批量操作** - 管理台支持导出/导入JSON格式链接
- **XSS防护** - 自动过滤危险脚本和URL协议
- **管理员模式** - 管理员提交不受限制，支持快速解析和批量管理
- **点击统计** - 记录每个链接的复制次数
- **响应式设计** - 玻璃态UI，适配移动端

## 技术架构

### 后端 (Node.js + Express + SQLite)
```
backend/
├── server.js                 # 入口文件
└── src/
    ├── db.js                 # 数据库封装 (Repository模式)
    ├── routes/
    │   ├── auth.js           # 认证路由
    │   └── links.js          # 链接路由
    ├── utils/
    │   └── helpers.js        # IP规范化等工具
    ├── services/
    │   └── scheduler.js      # 定时任务
    └── middleware/
        ├── auth.js           # 认证中间件
        └── xssSanitizer.js   # XSS防护中间件
```

### 前端 (React + Vite)
```
frontend/
└── src/
    ├── App.jsx               # 路由入口
    ├── utils/
    │   ├── api.js            # API请求 + FingerprintJS
    │   ├── helpers.js        # 时间格式化 + 导出导入
    │   └── storage.js        # localStorage操作
    ├── components/           # UI组件
    │   ├── HeroSection.jsx
    │   ├── MetricPill.jsx
    │   ├── StatusCard.jsx
    │   ├── LoadingCards.jsx
    │   ├── LinkCard.jsx
    │   └── Toast.jsx
    └── pages/
        ├── ViewPage.jsx      # 首页(自助提交)
        └── AdminPage.jsx     # 管理台
```

## 快速开始

### 本地开发

```bash
# 安装依赖
cd backend && npm install
cd frontend && npm install

# 启动后端
cd backend && npm run dev     # http://localhost:3818

# 启动前端
cd frontend && npm run dev    # http://localhost:5173
```

### Docker部署

1. 创建 `.env` 文件设置管理员密码：
```bash
echo "ADMIN_PASSWORD=your_secure_password" > .env
```

2. 启动服务：
```bash
docker-compose up -d --build
```

访问：
- 首页：http://localhost:8086
- 管理台：http://localhost:8086/admin

## 配置

### 环境变量

| 变量 | 必填 | 说明 |
|------|------|------|
| `ADMIN_PASSWORD` | ✅ | 管理员密码（无默认值，必须设置） |
| `PORT` | ❌ | 后端端口，默认3818 |

在 `.env` 文件或 `docker-compose.yml` 中配置：

```yaml
services:
  backend:
    environment:
      - ADMIN_PASSWORD=${ADMIN_PASSWORD}
```

### 提交限制

同一设备指纹 + 同一IP 组合每日可提交 **3次**，修改 `backend/src/db.js`：

```javascript
export const DAILY_LIMIT = 3;  // 改为需要的次数
```

## API接口

### 公共接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/links` | GET | 获取所有链接 |
| `/api/links/submission-count` | POST | 查询今日剩余次数 |
| `/api/links/public` | POST | 公共提交(受限) |
| `/api/links/:id/click` | POST | 点击计数 |

### 管理接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/auth` | POST | 密码验证 |
| `/api/links` | POST | 管理台添加(需密码) |
| `/api/links/:id` | PUT | 更新链接 |
| `/api/links/:id` | DELETE | 删除链接 |

### 公共提交示例

```javascript
// 获取指纹后提交
const fingerprint = await getFingerprint();

fetch('/api/links/public', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fingerprint,
    title: '链接标题',
    url: 'https://example.com',
    description: '描述(可选)'
  })
});
```

## IP兼容性

支持多种IP格式和代理环境：

- IPv4: `192.168.1.1`
- IPv6: `2001:db8::1`
- IPv4映射: `::ffff:192.168.1.1` → 自动转换为IPv4
- Localhost: `::1`, `127.0.0.1` → 统一为 `localhost`
- 代理头: `x-forwarded-for`, `x-real-ip`, `cf-connecting-ip` 等

## 远程部署

配置 `deploy.cjs`：

```javascript
const config = {
  prod: {
    host: 'your-server-ip',
    port: 22,
    user: 'root',
    pwd: 'your-password',
  },
};
```

执行部署：

```bash
node deploy.cjs prod
```

## 安全特性

### XSS防护
- 自动过滤请求体中的危险脚本
- 阻止 `javascript:`, `data:`, `vbscript:` 等危险URL协议
- 白名单模式清理HTML标签

### 标题相似度检测
- 使用 Levenshtein 距离算法计算相似度
- 标题相似度 ≥ 7% 时拒绝添加
- 防止重复链接和近似标题滥用

### 密码安全
- 管理员密码必须通过环境变量设置
- 无硬编码默认密码
- 前端与后端双重验证

## 依赖说明

### 后端
- `express` - Web框架
- `better-sqlite3` - SQLite数据库
- `node-cron` - 定时任务
- `cors` - 跨域支持
- `xss` - XSS过滤

### 前端
- `react` - UI框架
- `react-router-dom` - 路由
- `@fingerprintjs/fingerprintjs` - 浏览器指纹识别
- `vite` - 构建工具