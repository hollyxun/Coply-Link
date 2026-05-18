import { useEffect, useMemo, useState, useRef } from 'react';
import { HeroSection } from '../components/HeroSection';
import { MetricPill } from '../components/MetricPill';
import { StatusCard } from '../components/StatusCard';
import { LoadingCards } from '../components/LoadingCards';
import { Toast } from '../components/Toast';
import { API, requestJson, buildEditForm } from '../utils/api';
import { exportLinks, parseImportFile } from '../utils/helpers';

export function AdminPage() {
  const [links, setLinks] = useState([]);
  const [form, setForm] = useState({ title: '', url: '', description: '' });
  const [editingId, setEditingId] = useState(null);
  const [isAuthed, setIsAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [quickInput, setQuickInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [feedback, setFeedback] = useState({ message: '', tone: 'success' });
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const fileInputRef = useRef(null);

  const showFeedback = (tone, message) => {
    setFeedback({ tone, message });
  };

  useEffect(() => {
    if (!isAuthed) {
      return undefined;
    }

    let cancelled = false;

    const loadInitialAdminLinks = async () => {
      if (!cancelled) {
        setIsLoading(true);
      }

      try {
        const data = await requestJson(`${API}/links`);
        if (!cancelled) {
          setLinks(data);
        }
      } catch {
        if (!cancelled) {
          showFeedback('danger', '读取管理列表失败，请稍后重试。');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadInitialAdminLinks();

    return () => {
      cancelled = true;
    };
  }, [isAuthed]);

  const loadLinks = async () => {
    setIsLoading(true);
    try {
      const data = await requestJson(`${API}/links`);
      setLinks(data);
    } catch {
      showFeedback('danger', '读取管理列表失败，请稍后重试。');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({ title: '', url: '', description: '' });
  };

  const handleAuth = async (event) => {
    event.preventDefault();
    setAuthError('');

    try {
      const data = await requestJson(`${API}/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (!data.success) {
        setAuthError('密码错误，请重新输入。');
        return;
      }

      setIsAuthed(true);
    } catch {
      setAuthError('验证请求失败，请确认后端服务可用。');
    }
  };

  const handleQuickParse = () => {
    const input = quickInput.trim();
    const atIndex = input.indexOf('@');

    if (atIndex <= 0 || atIndex >= input.length - 1) {
      showFeedback('danger', '快速添加格式应为：标题@地址');
      return;
    }

    setForm((current) => ({
      ...current,
      title: input.slice(0, atIndex).trim(),
      url: input.slice(atIndex + 1).trim(),
    }));
    setQuickInput('');
    showFeedback('success', '已解析到表单，确认后可直接保存。');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingId) {
        await requestJson(`${API}/links/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, password }),
        });
        showFeedback('success', '链接已更新。');
      } else {
        await requestJson(`${API}/links`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, password }),
        });
        showFeedback('success', '新链接已添加。');
      }

      resetForm();
      await loadLinks();
    } catch {
      showFeedback('danger', '保存失败，请稍后重试。');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('确定删除这条链接吗？')) {
      return;
    }

    try {
      await requestJson(`${API}/links/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      showFeedback('success', '链接已删除。');
      await loadLinks();
    } catch {
      showFeedback('danger', '删除失败，请稍后重试。');
    }
  };

  const handleEdit = (link) => {
    setForm(buildEditForm(link));
    setEditingId(link.id);
    showFeedback('success', '已载入编辑内容。');
  };

  const handleExport = () => {
    const result = exportLinks(links);
    if (result.success) {
      showFeedback('success', `已导出 ${result.count} 条链接`);
    } else {
      showFeedback('danger', result.error);
    }
  };

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const parseResult = await parseImportFile(file);
    if (!parseResult.success) {
      showFeedback('danger', parseResult.error);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const link of parseResult.links) {
      try {
        await requestJson(`${API}/links`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: link.title,
            url: link.url,
            description: link.description || '',
            password,
          }),
        });
        successCount++;
      } catch {
        failCount++;
      }
    }

    if (successCount > 0) {
      showFeedback('success', `成功导入 ${successCount} 条链接${failCount > 0 ? `，${failCount} 条失败` : ''}`);
      await loadLinks();
    } else {
      showFeedback('danger', '导入失败，请检查文件内容');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === links.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(links.map((link) => link.id));
    }
  };

  const handleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) {
      showFeedback('danger', '请先选择要删除的链接');
      return;
    }

    if (!window.confirm(`确定删除选中的 ${selectedIds.length} 条链接吗？`)) {
      return;
    }

    try {
      const result = await requestJson(`${API}/links/batch`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, ids: selectedIds }),
      });
      showFeedback('success', `已删除 ${result.deletedCount} 条链接`);
      setSelectedIds([]);
      await loadLinks();
    } catch {
      showFeedback('danger', '批量删除失败，请稍后重试');
    }
  };

  const totalClicks = useMemo(
    () => links.reduce((sum, link) => sum + (link.clicks ?? 0), 0),
    [links],
  );

  if (!isAuthed) {
    return (
      <main className="page auth-page">
        <HeroSection eyebrow="Admin access" title="管理入口">
          <div className="metric-row">
            <MetricPill label="模式" value="安全验证" />
            <MetricPill label="表单风格" value="玻璃输入" />
          </div>
        </HeroSection>

        <form className="auth-form glass-panel" onSubmit={handleAuth}>
          <label className="field-label" htmlFor="password">
            管理密码
          </label>
          <input
            id="password"
            type="password"
            placeholder="输入管理密码"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {authError && <p className="field-error">{authError}</p>}
          <button type="submit" className="primary-button auth-submit">
            进入管理台
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="page manage-page">
      <HeroSection eyebrow="Workspace" title="链接管理台">
        <div className="metric-row">
          <MetricPill label="链接数量" value={isLoading ? '...' : links.length} />
          <MetricPill label="总复制" value={isLoading ? '...' : totalClicks} />
          <MetricPill label="编辑状态" value={editingId ? '编辑中' : '待新增'} />
        </div>
      </HeroSection>

      <Toast message={feedback.message} tone={feedback.tone} onClose={() => setFeedback({ message: '', tone: 'success' })} />

      <section className="admin-layout">
        <div className="editor-stack">
          <div className="glass-panel utility-panel">
            <div className="section-heading">
              <h2>快速解析</h2>
              <p>输入"标题@地址"，自动拆到表单里。</p>
            </div>

            <div className="quick-parse">
              <input
                placeholder="示例：NAS 控制台@http://192.168.1.10:5000"
                value={quickInput}
                onChange={(event) => setQuickInput(event.target.value)}
              />
              <button type="button" className="secondary-button" onClick={handleQuickParse}>
                解析
              </button>
            </div>
          </div>

          <form className="glass-panel editor-panel" onSubmit={handleSubmit}>
            <div className="section-heading">
              <h2>{editingId ? '编辑链接' : '新增链接'}</h2>
              <p>描述可选；支持网址、文件路径和局域网地址。</p>
            </div>

            <div className="form-grid">
              <input
                placeholder="标题"
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                required
              />
              <input
                placeholder="地址"
                value={form.url}
                onChange={(event) => setForm({ ...form, url: event.target.value })}
                required
              />
              <textarea
                className="full-span"
                placeholder="描述（可选）"
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="primary-button" disabled={isSubmitting}>
                {isSubmitting ? '保存中...' : editingId ? '更新链接' : '添加链接'}
              </button>
              {editingId && (
                <button type="button" className="secondary-button" onClick={resetForm}>
                  取消编辑
                </button>
              )}
            </div>
          </form>

          <div className="glass-panel utility-panel">
            <div className="section-heading">
              <h2>批量操作</h2>
              <p>导出当前所有链接或导入外部链接文件。</p>
            </div>

            <div className="form-actions">
              <button type="button" className="secondary-button" onClick={handleExport}>
                导出 JSON
              </button>
              <label className="secondary-button import-label">
                导入 JSON
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  style={{ display: 'none' }}
                />
              </label>
              {selectedIds.length > 0 && (
                <button type="button" className="danger-button" onClick={handleBatchDelete}>
                  删除选中 ({selectedIds.length})
                </button>
              )}
            </div>
          </div>
        </div>

        <section className="glass-panel list-panel">
          <div className="section-heading">
            <h2>当前链接</h2>
            <p>{isLoading ? '正在同步列表...' : `共 ${links.length} 条`}</p>
          </div>

          {isLoading ? (
            <LoadingCards />
          ) : links.length > 0 ? (
            <>
              <div className="list-header">
                <label className="select-all">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === links.length}
                    onChange={handleSelectAll}
                  />
                  全选
                </label>
                {selectedIds.length > 0 && (
                  <span className="selection-count">已选 {selectedIds.length} 条</span>
                )}
              </div>
              <div className="links-list">
                {links.map((link) => (
                  <article key={link.id} className="list-item list-item--with-checkbox">
                    <input
                      type="checkbox"
                      className="item-checkbox"
                      checked={selectedIds.includes(link.id)}
                      onChange={() => handleSelectOne(link.id)}
                    />
                    <div className="list-item__content">
                      <div className="list-item__copy">
                        <strong>{link.title}</strong>
                        <span>{link.url}</span>
                      </div>
                      <div className="list-item__meta">
                        <em>复制 {link.clicks}</em>
                        <div className="list-actions">
                          <button type="button" className="secondary-button" onClick={() => handleEdit(link)}>
                            编辑
                          </button>
                          <button type="button" className="danger-button" onClick={() => handleDelete(link.id)}>
                            删除
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <StatusCard
              title="列表为空"
              description="先添加一条链接，前台页面就会立即显示新的玻璃卡片。"
              tone="muted"
            />
          )}
        </section>
      </section>
    </main>
  );
}