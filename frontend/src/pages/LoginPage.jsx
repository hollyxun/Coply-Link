import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { HeroSection } from '../components/HeroSection';
import { API, requestJson } from '../utils/api';

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const data = await requestJson(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (data.success) {
        setIsLoading(false);
        localStorage.setItem('isAuthed', 'true');
        localStorage.setItem('username', username);
        localStorage.setItem('userId', data.userId.toString());
        navigate('/');
      } else {
        setError(data.message || '登录失败，请检查用户名和密码');
        setIsLoading(false);
      }
    } catch {
      setError('登录请求失败，请检查网络');
      setIsLoading(false);
    }
  };

  return (
    <main className="page auth-page">
      <HeroSection eyebrow="Welcome Back" title="账户登录">
      </HeroSection>

      <form className="auth-form glass-panel" onSubmit={handleLogin}>
        <div className="section-heading">
          <h2>登 录</h2>
          <p>请输入您的账号和密码进入控制台</p>
        </div>

        <div className="form-stack">
          <div className="field-group">
            <label className="field-label" htmlFor="username">用户名</label>
            <input
              id="username"
              type="text"
              placeholder="您的用户名"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="field-group">
            <label className="field-label" htmlFor="password">密码</label>
            <input
              id="password"
              type="password"
              placeholder="至少 6 位字符"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>
        </div>

        {error && <p className="field-error">{error}</p>}

        <button type="submit" className="primary-button auth-submit" disabled={isLoading}>
          {isLoading ? '正在验证身份...' : '立即进入控制台'}
        </button>

        <div className="auth-footer">
          <span style={{ color: 'var(--text-muted)' }}>还没有账号？</span>
          <Link to="/register" className="auth-link">
            快速注册
          </Link>
        </div>
      </form>
    </main>
  );
}
