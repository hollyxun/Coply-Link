export function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function exportLinks(links) {
  if (!links || links.length === 0) {
    return { success: false, error: '没有可导出的链接' };
  }

  const exportData = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    links: links.map((link) => ({
      title: link.title,
      url: link.url,
      description: link.description,
      clicks: link.clicks,
      createdAt: link.created_at,
    })),
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `coply-links-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);

  return { success: true, count: links.length };
}

export async function parseImportFile(file) {
  if (!file) {
    return { success: false, error: '未选择文件' };
  }

  try {
    const text = await file.text();
    const data = JSON.parse(text);

    if (!data.links || !Array.isArray(data.links)) {
      return { success: false, error: '导入文件格式不正确' };
    }

    const validLinks = data.links.filter((link) => link.title && link.url);

    if (validLinks.length === 0) {
      return { success: false, error: '文件中没有有效的链接' };
    }

    return { success: true, links: validLinks };
  } catch {
    return { success: false, error: '导入文件解析失败' };
  }
}