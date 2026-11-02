/**
 * Persistent browser-side binary file storage (IndexedDB + in-memory cache)
 * so administrators can upload video, PDF, image, and document files directly
 * from their device and students can play/view/download them immediately.
 */

const DB_NAME = 'suma_academy_media_db';
const STORE_NAME = 'uploaded_files';
const DB_VERSION = 1;

export interface StoredMediaFile {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  dataUrl: string;
  createdAt: string;
}

const memoryCache = new Map<string, StoredMediaFile>();

function openMediaDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB no disponible'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

export async function storeUploadedFile(file: File): Promise<{
  uri: string;
  record: StoredMediaFile;
}> {
  const dataUrl = await fileToDataUrl(file);
  const id = `file-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const record: StoredMediaFile = {
    id,
    name: file.name,
    mimeType: file.type || 'application/octet-stream',
    sizeBytes: file.size,
    dataUrl,
    createdAt: new Date().toISOString(),
  };

  memoryCache.set(id, record);

  try {
    const db = await openMediaDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Fallback to memory cache if IndexedDB is restricted
  }

  return {
    uri: `localfile://${id}`,
    record,
  };
}

export async function resolveMediaUri(uri: string): Promise<string> {
  if (!uri) return '';
  if (!uri.startsWith('localfile://')) return uri;

  const id = uri.replace('localfile://', '');
  const cached = memoryCache.get(id);
  if (cached) return cached.dataUrl;

  try {
    const db = await openMediaDb();
    const record = await new Promise<StoredMediaFile | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(id);
      req.onsuccess = () => resolve(req.result as StoredMediaFile | undefined);
      req.onerror = () => reject(req.error);
    });
    if (record) {
      memoryCache.set(id, record);
      return record.dataUrl;
    }
  } catch {
    // Ignore IDB read error
  }

  return '';
}
