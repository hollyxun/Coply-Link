import { formatTime } from '../utils/helpers';

export function LinkCard({ link, copied, onCopy, isCopied }) {
  // 三种状态：未复制、已复制（包括临时和持久）
  const buttonClass = copied || isCopied
    ? 'primary-button is-copied' // 已复制：绿色
    : 'primary-button'; // 未复制：蓝色

  const buttonText = copied || isCopied ? '已复制' : '复制链接';

  return (
    <article className="link-card glass-panel">
      <div className="card-topline">
        <span className="card-time">{formatTime(link.created_at)}</span>
        <span className="card-clicks">复制 {link.clicks}</span>
      </div>

      <div className="card-copy">
        <h3>{link.title}</h3>
        <p>{link.description || '点击复制后即可粘贴到浏览器、聊天框或文档中。'}</p>
      </div>

      <div className="link-content">{link.url}</div>

      <div className="card-footer">
        <span className="url-hint">支持网址、文件路径、局域网地址</span>
        <button
          type="button"
          className={buttonClass}
          onClick={() => onCopy(link)}
        >
          {buttonText}
        </button>
      </div>
    </article>
  );
}