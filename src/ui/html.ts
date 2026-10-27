export const esc = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
export const options = (values: readonly string[] | { value: string; label: string }[], current: unknown) => values.map(v => { const value = typeof v === 'string' ? v : v.value, label = typeof v === 'string' ? v : v.label; return `<option value="${esc(value)}" ${String(current ?? '') === value ? 'selected' : ''}>${esc(label)}</option>`; }).join('');
export const field = (label: string, control: string) => `<label class="field"><span>${esc(label)}</span>${control}</label>`;
export const empty = (text: string) => `<p class="empty-note">${esc(text)}</p>`;
