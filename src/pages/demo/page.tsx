import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Pin, PinOff, Plus, StickyNote, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { NOTE_COLORS } from "@/lib/note-colors.ts";
import { cn } from "@/lib/utils.ts";

const STORAGE_KEY = "cx-notes-demo";

type DemoNote = {
  id: string;
  title: string;
  content: string;
  colorIndex: number;
  isPinned: boolean;
  createdAt: string;
};

function loadNotes(): DemoNote[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((n): n is DemoNote => {
      if (typeof n !== "object" || n === null) return false;
      const c = n as Partial<DemoNote>;
      return (
        typeof c.id === "string" &&
        typeof c.title === "string" &&
        typeof c.content === "string" &&
        typeof c.colorIndex === "number" &&
        typeof c.isPinned === "boolean" &&
        typeof c.createdAt === "string"
      );
    });
  } catch {
    return [];
  }
}

export default function DemoNotesPage() {
  const [notes, setNotes] = useState<DemoNote[]>(() => loadNotes());
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [colorIndex, setColorIndex] = useState(0);

  // Persist to the browser only. Demo notes never reach the database.
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  }, [notes]);

  const addNote = useCallback(() => {
    if (!title.trim() && !content.trim()) {
      toast.error("Add a title or some text first");
      return;
    }
    setNotes((prev) => [
      {
        id: crypto.randomUUID(),
        title: title.trim(),
        content: content.trim(),
        colorIndex,
        isPinned: false,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
    setTitle("");
    setContent("");
    toast.success("Demo note saved in this browser");
  }, [title, content, colorIndex]);

  const removeNote = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    toast.success("Demo note deleted");
  };

  const togglePin = (id: string) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isPinned: !n.isPinned } : n)),
    );
  };

  const sorted = [...notes].sort((a, b) => Number(b.isPinned) - Number(a.isPinned));

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
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write something..."
            rows={4}
            className="rounded-xl border-0 bg-muted"
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
            <Button onClick={addNote} className="ml-auto rounded-xl">
              <Plus size={16} className="mr-1" /> Add note
            </Button>
          </div>
        </div>

        {sorted.length === 0 ? (
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
                    onClick={() => togglePin(note.id)}
                    className="cursor-pointer text-neutral-700 hover:text-neutral-900"
                    aria-label={note.isPinned ? "Unpin note" : "Pin note"}
                  >
                    {note.isPinned ? <PinOff size={14} /> : <Pin size={14} />}
                  </button>
                  <button
                    onClick={() => removeNote(note.id)}
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
