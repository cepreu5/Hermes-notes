export type DemoNote = {
  id: string;
  title: string;
  content: string;
  colorIndex: number;
  isPinned: boolean;
  createdAt: string;
  dueDate?: string;
  reminderAt?: string;
  labelIds?: string[];
};

export type DemoLabel = {
  id: string;
  name: string;
  colorHex: string;
  createdAt: string;
};

const DB_NAME = "cx-notes-demo";
const DB_VERSION = 2;
const STORE = "notes";
const LABELS_STORE = "labels";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(LABELS_STORE)) {
        db.createObjectStore(LABELS_STORE, { keyPath: "id" });
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

function isDemoLabel(value: unknown): value is DemoLabel {
  if (typeof value !== "object" || value === null) return false;
  const c = value as Partial<DemoLabel>;
  return (
    typeof c.id === "string" &&
    typeof c.name === "string" &&
    typeof c.colorHex === "string" &&
    typeof c.createdAt === "string"
  );
}

async function getAll(store: string): Promise<unknown[]> {
  const db = await openDb();
  try {
    return await new Promise<unknown[]>((resolve, reject) => {
      const request = db.transaction(store, "readonly").objectStore(store).getAll();
      request.onsuccess = () => resolve(request.result as unknown[]);
      request.onerror = () => reject(request.error ?? new Error("Cannot read data"));
    });
  } finally {
    db.close();
  }
}

async function put(store: string, value: DemoNote | DemoLabel): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(store, "readwrite");
      tx.objectStore(store).put(value);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("Cannot save data"));
    });
  } finally {
    db.close();
  }
}

async function remove(store: string, id: string): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(store, "readwrite");
      tx.objectStore(store).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("Cannot delete data"));
    });
  } finally {
    db.close();
  }
}

export async function listDemoNotes(): Promise<DemoNote[]> {
  const rows = await getAll(STORE);
  return rows.filter(isDemoNote).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function putDemoNote(note: DemoNote): Promise<void> {
  await put(STORE, note);
}

export async function deleteDemoNote(id: string): Promise<void> {
  await remove(STORE, id);
}

export async function listDemoLabels(): Promise<DemoLabel[]> {
  const rows = await getAll(LABELS_STORE);
  return rows.filter(isDemoLabel).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function putDemoLabel(label: DemoLabel): Promise<void> {
  await put(LABELS_STORE, label);
}

// Deleting a label also strips it from every stored note
export async function deleteDemoLabel(id: string): Promise<void> {
  await remove(LABELS_STORE, id);
  const notes = await listDemoNotes();
  for (const note of notes) {
    if (note.labelIds?.includes(id)) {
      await putDemoNote({ ...note, labelIds: note.labelIds.filter((x) => x !== id) });
    }
  }
}
