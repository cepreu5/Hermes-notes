export type DemoNote = {
  id: string;
  title: string;
  content: string;
  colorIndex: number;
  isPinned: boolean;
  createdAt: string;
};

const DB_NAME = "cx-notes-demo";
const DB_VERSION = 1;
const STORE = "notes";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Cannot open database"));
  });
}

function isDemoNote(value: unknown): value is DemoNote {
  if (typeof value !== "object" || value === null) return false;
  const c = value as Partial<DemoNote>;
  return (
    typeof c.id === "string" &&
    typeof c.title === "string" &&
    typeof c.content === "string" &&
    typeof c.colorIndex === "number" &&
    typeof c.isPinned === "boolean" &&
    typeof c.createdAt === "string"
  );
}

export async function listDemoNotes(): Promise<DemoNote[]> {
  const db = await openDb();
  try {
    const rows = await new Promise<unknown[]>((resolve, reject) => {
      const request = db.transaction(STORE, "readonly").objectStore(STORE).getAll();
      request.onsuccess = () => resolve(request.result as unknown[]);
      request.onerror = () => reject(request.error ?? new Error("Cannot read notes"));
    });
    return rows
      .filter(isDemoNote)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } finally {
    db.close();
  }
}

export async function putDemoNote(note: DemoNote): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(note);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("Cannot save note"));
    });
  } finally {
    db.close();
  }
}

export async function deleteDemoNote(id: string): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("Cannot delete note"));
    });
  } finally {
    db.close();
  }
}

// One-time migration of demo notes previously kept in localStorage.
export async function migrateLegacyDemoNotes(): Promise<void> {
  const raw = localStorage.getItem("cx-notes-demo");
  if (!raw) return;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        if (isDemoNote(item)) await putDemoNote(item);
      }
    }
  } catch {
    // Ignore unreadable legacy data
  }
  localStorage.removeItem("cx-notes-demo");
}
