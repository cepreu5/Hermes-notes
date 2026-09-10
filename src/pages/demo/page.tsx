import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";
import { ArrowLeft, Bell, Calendar, Pin, PinOff, Plus, StickyNote, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { NOTE_COLORS } from "@/lib/note-colors.ts";
import NoteModal, { type NoteDraft } from "../notes/_components/NoteModal.tsx";
import {
  deleteDemoNote,
  listDemoLabels,
  listDemoNotes,
  putDemoNote,
  type DemoLabel,
  type DemoNote,
} from "@/lib/demo-notes-db.ts";

type ModalState = { mode: "create" } | { mode: "edit"; note: DemoNote } | null;

function toDraft(note: DemoNote): NoteDraft {
  return {
    title: note.title,
    content: note.content,
    colorIndex: note.colorIndex,
    dueDate: note.dueDate,
    reminderAt: note.reminderAt,
    labelIds: note.labelIds,
  };
}

export default function DemoNotesPage() {
  const [notes, setNotes] = useState<DemoNote[] | undefined>(undefined);
  const [labels, setLabels] = useState<DemoLabel[]>([]);
  const [modal, setModal] = useState<ModalState>(null);

  // Load demo notes and labels from IndexedDB (browser-only, never the database).
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [rows, labelRows] = await Promise.all([listDemoNotes(), listDemoLabels()]);
        if (!cancelled) {
          setNotes(rows);
          setLabels(labelRows);
        }
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

  const refreshLabels = async () => {
    try {
      setLabels(await listDemoLabels());
    } catch {
      // Labels stay as-is if the read fails
    }
  };

  const handleSave = useCallback(
    async (data: {
      title: string;
      content: string;
      colorIndex: number;
      labelIds: string[];
      dueDate?: string;
      reminderAt?: string;
    }) => {
      const editing = modal?.mode === "edit" ? modal.note : null;
      const note: DemoNote = {
        id: editing?.id ?? crypto.randomUUID(),
        title: data.title,
        content: data.content,
        colorIndex: data.colorIndex,
        isPinned: editing?.isPinned ?? false,
        createdAt: editing?.createdAt ?? new Date().toISOString(),
        dueDate: data.dueDate,
        reminderAt: data.reminderAt,
        labelIds: data.labelIds,
      };
      try {
        await putDemoNote(note);
        setNotes((prev) =>
          editing
            ? (prev ?? []).map((n) => (n.id === note.id ? note : n))
            : [note, ...(prev ?? [])],
        );
        toast.success(editing ? "Demo note saved" : "Demo note created");
      } catch {
        toast.error("Could not save the note");
      }
    },
    [modal],
  );

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

  const closeModal = () => {
    setModal(null);
    void refreshLabels();
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
            <p className="mb-6 text-sm text-muted-foreground">
              Press + to try the full note editor without signing in
            </p>
            <Button onClick={() => setModal({ mode: "create" })} className="rounded-xl">
              <Plus size={16} className="mr-1" /> New Note
            </Button>
          </div>
        ) : (
          <div className="columns-1 gap-4 space-y-4 sm:columns-2 lg:columns-3">
            {sorted.map((note) => {
              const noteLabels = labels.filter((l) => note.labelIds?.includes(l.id));
              return (
                <div
                  key={note.id}
                  className="group break-inside-avoid cursor-pointer rounded-2xl p-4 shadow-sm transition-shadow hover:shadow-md"
                  onClick={() => setModal({ mode: "edit", note })}
                  style={{ background: NOTE_COLORS[note.colorIndex % NOTE_COLORS.length].bg }}
                >
                  <div className="flex items-start gap-2">
                    <h3 className="flex-1 font-bold break-words text-neutral-900">
                      {note.title || "Untitled"}
                    </h3>
                    <button
                      onClick={(e) => { e.stopPropagation(); void togglePin(note); }}
                      className="cursor-pointer text-neutral-700 hover:text-neutral-900"
                      aria-label={note.isPinned ? "Unpin note" : "Pin note"}
                    >
                      {note.isPinned ? <PinOff size={14} /> : <Pin size={14} />}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); void removeNote(note.id); }}
                      className="cursor-pointer text-neutral-700 hover:text-red-600"
                      aria-label="Delete note"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  {note.content && (
                    <div
                      className="mt-2 text-sm break-words text-neutral-800 [&_a]:underline [&_li]:ml-4 [&_li]:list-disc"
                      dangerouslySetInnerHTML={{ __html: note.content }}
                    />
                  )}
                  {noteLabels.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {noteLabels.map((label) => (
                        <span
                          key={label.id}
                          className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                          style={{ background: label.colorHex + "33", color: label.colorHex }}
                        >
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: label.colorHex }} />
                          {label.name}
                        </span>
                      ))}
                    </div>
                  )}
                  {(note.dueDate || note.reminderAt) && (
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      {note.dueDate && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-black/10 px-2 py-0.5 text-[10px] font-bold text-neutral-800">
                          <Calendar size={10} />
                          {format(new Date(note.dueDate), "MMM d, HH:mm")}
                        </span>
                      )}
                      {note.reminderAt && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/40 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                          <Bell size={10} />
                          {format(new Date(note.reminderAt), "MMM d, HH:mm")}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      <button
        onClick={() => setModal({ mode: "create" })}
        className="fixed right-6 bottom-6 z-30 flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-2xl transition-all duration-250 hover:scale-110 hover:rotate-90 active:scale-95"
        aria-label="New note"
      >
        <Plus size={26} />
      </button>

      {modal && (
        <NoteModal
          demo
          note={modal.mode === "edit" ? toDraft(modal.note) : null}
          onSave={handleSave}
          onClose={closeModal}
        />
      )}
    </div>
  );
}
