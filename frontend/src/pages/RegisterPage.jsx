import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { HeroSection } from '../components/HeroSection';
import { API, requestJson } from '../utils/api';


export function RegisterPage() {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState(null); // null, 'available', 'taken'
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
    if (id === 'username') {
      setUsernameStatus(null);
    }
  };

  const checkUsername = async () => {
    if (!formData.username) return;
    setIsCheckingUsername(true);
    setUsernameStatus(null);
    try {
      const data = await requestJson(`${API}/auth/check-username`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: formData.username }),
      });
      if (data.exists) {
        setUsernameStatus('taken');
        setError('用户名已被占用');
      } else {
        setUsernameStatus('available');
        setError('');
      }
    } catch {
      setError('检查用户名失败，请稍后重试');
    } finally {
      setIsCheckingUsername(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    if (usernameStatus !== 'available') {
      const msg = '请先点击“检查重复”并确保用户名可用后再注册';
      setError(msg);
      alert(msg);
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('密码长度至少为 6 位');
      setIsLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('两次输入的密码不一致');
      setIsLoading(false);
      return;
    }

    try {
      const data = await requestJson(`${API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password
        }),
      });

      if (data.success) {
        setIsLoading(false);
        navigate('/login');
      } else {
        setError(data.message || '注册失败');
        setIsLoading(false);
      }
    } catch (err) {
      setError('注册请求失败，请检查网络');
      setIsLoading(false);
    }
  };

  return (
    <main className="page auth-page">
      <HeroSection eyebrow="Join Us" title="创建账户">
      </HeroSection>

      <form className="auth-form glass-panel" onSubmit={handleRegister}>
        <div className="section-heading">
          <h2>注 册</h2>
          <p>只需几步，开启您的 Coply-Link 高效之旅</p>
        </div>

        <div className="form-stack">
          <div className="field-group">
            <label className="field-label" htmlFor="username">用户名</label>
            <div className="input-with-action">
              <input
                id="username"
                type="text"
                placeholder="设置您的唯一标识"
                value={formData.username}
                onChange={handleInputChange}
                required
              />
              <button
                type="button"
                className="secondary-button check-button"
                onClick={checkUsername}
                disabled={isCheckingUsername || !formData.username}
              >
                {isCheckingUsername ? '检查中...' : '检查重复'}
              </button>
            </div>
            {usernameStatus === 'available' && <p className="field-success" style={{ color: 'var(--success)', marginTop: '4px', fontSize: '0.85rem' }}>该用户名可以使用</p>}
            {usernameStatus === 'taken' && <p className="field-error" style={{ marginTop: '4px', fontSize: '0.85rem' }}>该用户名已被占用</p>}

          </div>

          <div className="field-group">
            <label className="field-label" htmlFor="password">设置密码</label>
            <input
              id="password"
              type="password"
              placeholder="至少 6 位字符"
              value={formData.password}
              onChange={handleInputChange}
              minLength={6}
              required
            />
          </div>
          <div className="field-group">
            <label className="field-label" htmlFor="confirmPassword">确认密码</label>
            <input
              id="confirmPassword"
              type="password"
              placeholder="再次输入密码"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              minLength={6}
              required
            />
          </div>
        </div>

        {error && <p className="field-error">{error}</p>}

        <button 
          type="submit" 
          className="primary-button auth-submit" 
          disabled={isLoading}
        >
          {isLoading ? '正在同步云端...' : '开启我的空间'}
        </button>
        {!usernameStatus && !isLoading && (
          <p className="auth-hint" style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px' }}>
            需先点击“检查重复”验证用户名
          </p>
        )}

        <div className="auth-footer">
          <span style={{ color: 'var(--text-muted)' }}>已有账号？</span>
          <Link to="/login" className="auth-link">
            直接登录
          </Link>
        </div>
      </form>
    </main>
  );
}
