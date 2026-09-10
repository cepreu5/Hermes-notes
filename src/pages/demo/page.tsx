import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Pin, PinOff, Plus, StickyNote, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { NOTE_COLORS } from "@/lib/note-colors.ts";
import { cn } from "@/lib/utils.ts";
import {
  deleteDemoNote,
  listDemoNotes,
  putDemoNote,
  type DemoNote,
} from "@/lib/demo-notes-db.ts";

export default function DemoNotesPage() {
  const [notes, setNotes] = useState<DemoNote[] | undefined>(undefined);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [colorIndex, setColorIndex] = useState(0);

  // Load demo notes from IndexedDB (browser-only storage, never the database).
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const rows = await listDemoNotes();
        if (!cancelled) setNotes(rows);
      } catch {
        if (!cancelled) {
          setNotes([]);
          toast.error("Cannot open local storage in this browser");
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const addNote = useCallback(async () => {
    if (!title.trim() && !content.trim()) {
      toast.error("Add a title or some text first");
      return;
    }
    const note: DemoNote = {
      id: crypto.randomUUID(),
      title: title.trim(),
      content: content.trim(),
      colorIndex,
      isPinned: false,
      createdAt: new Date().toISOString(),
    };
    try {
      await putDemoNote(note);
      setNotes((prev) => [note, ...(prev ?? [])]);
      setTitle("");
      setContent("");
      toast.success("Demo note saved in this browser");
    } catch {
      toast.error("Could not save the note");
    }
  }, [title, content, colorIndex]);

  const removeNote = async (id: string) => {
    try {
      await deleteDemoNote(id);
      setNotes((prev) => (prev ?? []).filter((n) => n.id !== id));
      toast.success("Demo note deleted");
    } catch {
      toast.error("Could not delete the note");
    }
  };

  const togglePin = async (note: DemoNote) => {
    const updated: DemoNote = { ...note, isPinned: !note.isPinned };
    try {
      await putDemoNote(updated);
      setNotes((prev) => (prev ?? []).map((n) => (n.id === note.id ? updated : n)));
    } catch {
      toast.error("Could not update the note");
    }
  };

  const sorted = [...(notes ?? [])].sort(
    (a, b) => Number(b.isPinned) - Number(a.isPinned),
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3">
          <Link
            to="/"
            className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={15} /> Back
          </Link>
          <span className="ml-auto rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
            Demo mode - stored only in this browser
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl px-4 py-6">
        <div className="mb-8 space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Note title"
            className="rounded-xl border-0 bg-muted text-base font-semibold"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write something..."
            rows={4}
            className="w-full resize-y rounded-xl bg-muted px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <div className="flex flex-wrap items-center gap-2">
            {NOTE_COLORS.map((color, i) => (
              <button
                key={color.label}
                onClick={() => setColorIndex(i)}
                aria-label={color.label}
                className={cn(
                  "h-7 w-7 cursor-pointer rounded-full border-2 transition-transform hover:scale-110",
                  colorIndex === i ? "border-foreground" : "border-transparent",
                )}
                style={{ background: color.bg }}
              />
            ))}
            <Button onClick={() => void addNote()} className="ml-auto rounded-xl">
              <Plus size={16} className="mr-1" /> Add note
            </Button>
          </div>
        </div>

        {notes === undefined ? (
          <div className="columns-1 gap-4 space-y-4 sm:columns-2 lg:columns-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton
                key={i}
                className="break-inside-avoid rounded-2xl"
                style={{ height: 120 + (i % 3) * 40 }}
              />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
              <StickyNote size={28} className="text-muted-foreground" />
            </div>
            <h3 className="mb-1 text-lg font-bold">No demo notes yet</h3>
            <p className="text-sm text-muted-foreground">
              Add one above to try the app without signing in
            </p>
          </div>
        ) : (
          <div className="columns-1 gap-4 space-y-4 sm:columns-2 lg:columns-3">
            {sorted.map((note) => (
              <div
                key={note.id}
                className="group break-inside-avoid rounded-2xl p-4 shadow-sm"
                style={{ background: NOTE_COLORS[note.colorIndex % NOTE_COLORS.length].bg }}
              >
                <div className="flex items-start gap-2">
                  <h3 className="flex-1 font-bold break-words text-neutral-900">
                    {note.title || "Untitled"}
                  </h3>
                  <button
                    onClick={() => void togglePin(note)}
                    className="cursor-pointer text-neutral-700 hover:text-neutral-900"
                    aria-label={note.isPinned ? "Unpin note" : "Pin note"}
                  >
                    {note.isPinned ? <PinOff size={14} /> : <Pin size={14} />}
                  </button>
                  <button
                    onClick={() => void removeNote(note.id)}
                    className="cursor-pointer text-neutral-700 hover:text-red-600"
                    aria-label="Delete note"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                {note.content && (
                  <p className="mt-2 text-sm whitespace-pre-wrap break-words text-neutral-800">
                    {note.content}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
