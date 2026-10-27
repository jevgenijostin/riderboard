import { type Doc, position } from './types';
import { checkIntegrity, docSchema } from './schema';
export const STORAGE_KEY = 'riderboard:v1';
export const toJSON = (doc: Doc) => JSON.stringify(doc, null, 2);
export function fromJSON(text: string): { doc: Doc; notices: string[] } | { errors: string[] } {
  try {
    const parsed = docSchema.safeParse(JSON.parse(text));
    if (!parsed.success) return { errors: parsed.error.issues.map(i => `${i.path.join('.') || 'Document'}: ${i.message}`) };
    const doc: Doc = parsed.data;
    const errors = checkIntegrity(doc); if (errors.length) return { errors };
    const notices: string[] = [];
    for (const i of doc.items) { const x = position(i.x, doc.stage.widthM), y = position(i.y, doc.stage.depthM); if (i.x !== x || i.y !== y) notices.push(`${i.name}: position rounded/clamped to the stage.`); i.x = x; i.y = y; }
    return { doc, notices };
  } catch { return { errors: ['Invalid JSON. Choose a RiderBoard version 1 export.'] }; }
}
export interface Library { bands: Doc[]; activeId: string }
export interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void }
export function loadLibrary(storage: StorageLike): { library?: Library; notice?: string } {
  try {
    const text = storage.getItem(STORAGE_KEY); if (!text) return {};
    const raw = JSON.parse(text) as Partial<Library>;
    if (!Array.isArray(raw.bands) || !raw.bands.length || typeof raw.activeId !== 'string') return { notice: 'Local data is corrupt. Started fresh; import a JSON backup to restore.' };
    const bands: Doc[] = [];
    for (const b of raw.bands) { const result = fromJSON(JSON.stringify(b)); if ('errors' in result) return { notice: 'Local data is corrupt. Started fresh; import a JSON backup to restore.' }; bands.push(result.doc); }
    if (new Set(bands.map(b => b.id)).size !== bands.length || !bands.some(b => b.id === raw.activeId)) return { notice: 'Local band references are corrupt. Started fresh.' };
    return { library: { bands, activeId: raw.activeId } };
  } catch { return { notice: 'Local storage could not be read. Started fresh; export JSON to back up your work.' }; }
}
export function saveLibrary(storage: StorageLike, library: Library): string | undefined { try { storage.setItem(STORAGE_KEY, JSON.stringify(library)); } catch { return 'Local storage is unavailable or full. Export JSON now to keep a backup.'; } }
