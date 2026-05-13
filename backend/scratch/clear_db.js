import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../../data/links.db');
const db = new Database(dbPath);

console.log('正在清理数据库...');

try {
  db.prepare('DELETE FROM links').run();
  db.prepare('DELETE FROM submission_limits').run();
  // 注意：通常不建议删除用户，但如果需要全清可以加上
  // db.prepare('DELETE FROM users').run();
  
  console.log('✅ 链接数据和提交限制已成功清空。');
} catch (err) {
  console.error('❌ 清理失败:', err.message);
} finally {
  db.close();
}
