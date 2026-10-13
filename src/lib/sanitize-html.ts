/**
 * Sanitização básica de HTML gerado pelo editor TipTap
 * para páginas públicas (shared link).
 */
export function sanitizeMeetingHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/<(iframe|object|embed|form|input|button)[\s\S]*?>/gi, "");
}
