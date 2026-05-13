import { useEffect } from 'react';

export function Toast({ message, tone = 'success', onClose, duration = 1500 }) {
  useEffect(() => {
    if (message && onClose) {
      const timer = window.setTimeout(onClose, duration);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [message, onClose, duration]);

  if (!message) return null;

  const toneClass = tone === 'success' ? 'copy-toast--success' : 'copy-toast--danger';

  return (
    <div className={`copy-toast ${toneClass}`}>
      {message}
    </div>
  );
}