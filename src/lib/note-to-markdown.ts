/** Convert a note's HTML content to Markdown */
export function htmlToMarkdown(html: string): string {
  return html
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, "# $1\n")
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1\n")
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, "### $1\n")
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, "**$1**")
    .replace(/<b[^>]*>(.*?)<\/b>/gi, "**$1**")
    .replace(/<em[^>]*>(.*?)<\/em>/gi, "_$1_")
    .replace(/<i[^>]*>(.*?)<\/i>/gi, "_$1_")
    .replace(/<s[^>]*>(.*?)<\/s>/gi, "~~$1~~")
    .replace(/<code[^>]*>(.*?)<\/code>/gi, "`$1`")
    .replace(/<li[^>]*>(.*?)<\/li>/gi, "- $1\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<p[^>]*>(.*?)<\/p>/gi, "$1\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function noteToMarkdown(title: string, content: string, dueDate?: string, reminderAt?: string): string {
  const isHtml = content.trim().startsWith("<");
  const body = isHtml ? htmlToMarkdown(content) : content;

  const lines: string[] = [];
  if (title) {
    lines.push(`# ${title}`);
    lines.push("");
  }
  lines.push(body);
  if (dueDate || reminderAt) {
    lines.push("");
    lines.push("---");
    if (dueDate) lines.push(`**Due:** ${new Date(dueDate).toLocaleString()}`);
    if (reminderAt) lines.push(`**Reminder:** ${new Date(reminderAt).toLocaleString()}`);
  }
  return lines.join("\n");
}

export function downloadMarkdown(title: string, content: string, dueDate?: string, reminderAt?: string) {
  const md = noteToMarkdown(title, content, dueDate, reminderAt);
  const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(title || "note").replace(/[^a-z0-9]/gi, "-").toLowerCase()}.md`;
  a.click();
  URL.revokeObjectURL(url);
}
