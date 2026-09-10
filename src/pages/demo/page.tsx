import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  ArrowLeft,
  Bell,
  Calendar,
  ChevronDown,
  LayoutGrid,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Search,
  StickyNote,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { cn } from "@/lib/utils.ts";
import { BOARD_COLORS, NOTE_COLORS } from "@/lib/note-colors.ts";
import NoteModal, { type NoteDraft } from "../notes/_components/NoteModal.tsx";
import BoardModal from "../notes/_components/BoardModal.tsx";
import {
  deleteDemoBoard,
  deleteDemoNote,
  listDemoBoards,
  listDemoLabels,
  listDemoNotes,
  putDemoBoard,
  putDemoNote,
  type DemoBoard,
  type DemoLabel,
  type DemoNote,
} from "@/lib/demo-notes-db.ts";

type NoteModalState =
  | { mode: "create"; boardId?: string }
  | { mode: "edit"; note: DemoNote }
  | null;
type BoardModalState =
  | { mode: "create" }
  | { mode: "edit"; board: DemoBoard }
  | null;

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
  const [boards, setBoards] = useState<DemoBoard[]>([]);
  const [activeBoardId, setActiveBoardId] = useState<string | undefined>(undefined);
  const [activeLabelId, setActiveLabelId] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [noteModal, setNoteModal] = useState<NoteModalState>(null);
  const [boardModal, setBoardModal] = useState<BoardModalState>(null);
  const [showBoardMenu, setShowBoardMenu] = useState(false);

  // Load all data from IndexedDB on mount
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [rows, labelRows, boardRows] = await Promise.all([
          listDemoNotes(),
          listDemoLabels(),
          listDemoBoards(),
        ]);
        if (!cancelled) {
          setNotes(rows);
          setLabels(labelRows);
          setBoards(boardRows);
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

  const refreshAll = async () => {
    try {
      const [rows, labelRows, boardRows] = await Promise.all([
        listDemoNotes(),
        listDemoLabels(),
        listDemoBoards(),
      ]);
      setNotes(rows);
      setLabels(labelRows);
      setBoards(boardRows);
    } catch {
      // Keep current state if refresh fails
    }
  };

  // ── Note handlers ──────────────────────────────────────────────────────────
  const handleSaveNote = useCallback(
    async (data: {
      title: string;
      content: string;
      colorIndex: number;
      labelIds: string[];
      dueDate?: string;
      reminderAt?: string;
    }) => {
      const editing = noteModal?.mode === "edit" ? noteModal.note : null;
      const boardId =
        editing?.boardId ??
        (noteModal?.mode === "create" ? noteModal.boardId : activeBoardId);
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
        boardId,
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
    [noteModal, activeBoardId],
  );

  const removeNote = useCallback(async (id: string) => {
    try {
      await deleteDemoNote(id);
      setNotes((prev) => (prev ?? []).filter((n) => n.id !== id));
      toast.success("Demo note deleted");
    } catch {
      toast.error("Could not delete the note");
    }
  }, []);

  const togglePin = useCallback(async (note: DemoNote) => {
    const updated: DemoNote = { ...note, isPinned: !note.isPinned };
    try {
      await putDemoNote(updated);
      setNotes((prev) => (prev ?? []).map((n) => (n.id === note.id ? updated : n)));
    } catch {
      toast.error("Could not update the note");
    }
  }, []);

  // ── Board handlers ─────────────────────────────────────────────────────────
  const handleSaveBoard = useCallback(
    async (data: { name: string; colorIndex: number }) => {
      try {
        if (boardModal?.mode === "edit") {
          const updated: DemoBoard = {
            ...boardModal.board,
            name: data.name,
            colorIndex: data.colorIndex,
          };
          await putDemoBoard(updated);
          setBoards((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
          toast.success("Board updated");
        } else {
          const board: DemoBoard = {
            id: crypto.randomUUID(),
            name: data.name,
            colorIndex: data.colorIndex,
            createdAt: new Date().toISOString(),
          };
          await putDemoBoard(board);
          setBoards((prev) => [...prev, board]);
          toast.success("Board created");
        }
      } catch {
        toast.error("Error saving board");
      }
    },
    [boardModal],
  );

  const handleDeleteBoard = useCallback(
    async (id: string) => {
      try {
        await deleteDemoBoard(id);
        if (activeBoardId === id) setActiveBoardId(undefined);
        await refreshAll();
        toast.success("Board deleted");
      } catch {
        toast.error("Error deleting board");
      }
    },
    [activeBoardId],
  );

  // ── Derived data ───────────────────────────────────────────────────────────
  const allNotes = notes ?? [];

  const filteredNotes = allNotes
    .filter((n) => (activeBoardId ? n.boardId === activeBoardId : true))
    .filter((n) => (activeLabelId ? n.labelIds?.includes(activeLabelId) : true))
    .filter((n) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q)
      );
    });

  const pinnedNotes = filteredNotes.filter((n) => n.isPinned);
  const unpinnedNotes = filteredNotes.filter((n) => !n.isPinned);
  const activeBoard = boards.find((b) => b.id === activeBoardId);
  const activeLabel = labels.find((l) => l.id === activeLabelId);

  const closeNoteModal = () => {
    setNoteModal(null);
    void refreshAll();
  };

  // ── Note card ──────────────────────────────────────────────────────────────
  const NoteCard = ({ note }: { note: DemoNote }) => {
    const noteLabels = labels.filter((l) => note.labelIds?.includes(l.id));
    return (
      <div
        className="group break-inside-avoid cursor-pointer rounded-2xl p-4 shadow-sm transition-shadow hover:shadow-md"
        onClick={() => setNoteModal({ mode: "edit", note })}
        style={{ background: NOTE_COLORS[note.colorIndex % NOTE_COLORS.length].bg }}
      >
        <div className="flex items-start gap-2">
          <h3 className="flex-1 font-bold break-words text-neutral-900">
            {note.title || "Untitled"}
          </h3>
          <button
            onClick={(e) => {
              e.stopPropagation();
              void togglePin(note);
            }}
            className="cursor-pointer text-neutral-700 hover:text-neutral-900"
            aria-label={note.isPinned ? "Unpin note" : "Pin note"}
          >
            {note.isPinned ? <PinOff size={14} /> : <Pin size={14} />}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              void removeNote(note.id);
            }}
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
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: label.colorHex }}
                />
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
  };

  const NoteGrid = ({ noteList }: { noteList: DemoNote[] }) => (
    <div className="columns-1 gap-4 space-y-4 sm:columns-2 lg:columns-3">
      {noteList.map((note) => (
        <NoteCard key={note.id} note={note} />
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <Link
            to="/"
            className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground flex-shrink-0"
          >
            <ArrowLeft size={15} /> Back
          </Link>

          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search demo notes..."
              className="pl-9 pr-8 rounded-xl bg-muted border-0 focus-visible:ring-2"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center hover:bg-muted-foreground/20 transition-colors"
                aria-label="Clear search"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Board picker */}
          <div className="relative ml-auto">
            <button
              onClick={() => setShowBoardMenu((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-muted transition-colors text-sm font-semibold"
              aria-expanded={showBoardMenu}
              aria-haspopup="true"
            >
              <LayoutGrid size={16} />
              <span className="hidden sm:block max-w-[100px] truncate">
                {activeBoard?.name ?? "All"}
              </span>
              <ChevronDown
                size={14}
                className={`transition-transform ${showBoardMenu ? "rotate-180" : ""}`}
              />
            </button>

            {showBoardMenu && (
              <div
                className="absolute right-0 top-full mt-1 w-64 bg-popover border border-border rounded-2xl shadow-xl z-50 py-2"
                role="menu"
              >
                <button
                  className="w-full text-left px-4 py-2.5 text-sm font-semibold hover:bg-muted transition-colors flex items-center gap-2"
                  onClick={() => {
                    setActiveBoardId(undefined);
                    setShowBoardMenu(false);
                  }}
                  role="menuitem"
                >
                  <span className="w-3 h-3 rounded-full bg-primary flex-shrink-0" />
                  All notes
                </button>
                {boards.map((board) => {
                  const bc = BOARD_COLORS[board.colorIndex % BOARD_COLORS.length];
                  return (
                    <div key={board.id} className="group flex items-center px-2">
                      <button
                        className="flex-1 text-left px-2 py-2.5 text-sm hover:bg-muted transition-colors flex items-center gap-2"
                        onClick={() => {
                          setActiveBoardId(board.id);
                          setShowBoardMenu(false);
                        }}
                        role="menuitem"
                      >
                        <span
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ background: bc.bg }}
                        />
                        <span className="truncate">{board.name}</span>
                      </button>
                      <button
                        onClick={() => {
                          setBoardModal({ mode: "edit", board });
                          setShowBoardMenu(false);
                        }}
                        className="p-2 opacity-0 group-hover:opacity-100 hover:text-primary transition-all"
                        aria-label="Edit board"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => {
                          void handleDeleteBoard(board.id);
                          setShowBoardMenu(false);
                        }}
                        className="p-2 opacity-0 group-hover:opacity-100 hover:text-destructive transition-all"
                        aria-label="Delete board"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })}
                <div className="border-t border-border mt-1 pt-1">
                  <button
                    className="w-full text-left px-4 py-2.5 text-sm font-semibold text-primary hover:bg-muted transition-colors flex items-center gap-2"
                    onClick={() => {
                      setBoardModal({ mode: "create" });
                      setShowBoardMenu(false);
                    }}
                    role="menuitem"
                  >
                    <Plus size={14} /> New Board
                  </button>
                </div>
              </div>
            )}
          </div>

          <span className="hidden sm:block rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary flex-shrink-0">
            Demo – stored in browser only
          </span>
        </div>

        {/* Active filters */}
        {(activeBoard || activeLabel) && (
          <div className="max-w-5xl mx-auto px-4 pb-2 flex items-center gap-2 flex-wrap">
            {activeBoard && (
              <span
                className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full text-white"
                style={{
                  background: BOARD_COLORS[activeBoard.colorIndex % BOARD_COLORS.length].bg,
                }}
              >
                <LayoutGrid size={11} />
                {activeBoard.name}
                <button
                  onClick={() => setActiveBoardId(undefined)}
                  className="ml-0.5 opacity-70 hover:opacity-100"
                  aria-label="Clear board filter"
                >
                  ×
                </button>
              </span>
            )}
            {activeLabel && (
              <span
                className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full"
                style={{
                  background: activeLabel.colorHex + "33",
                  color: activeLabel.colorHex,
                }}
              >
                <Tag size={11} />
                {activeLabel.name}
                <button
                  onClick={() => setActiveLabelId(undefined)}
                  className="ml-0.5 opacity-70 hover:opacity-100"
                  aria-label="Clear label filter"
                >
                  ×
                </button>
              </span>
            )}
          </div>
        )}

        {/* Label pills */}
        {labels.length > 0 && (
          <div className="max-w-5xl mx-auto px-4 pb-2 flex items-center gap-1.5 overflow-x-auto">
            <Tag size={13} className="text-muted-foreground flex-shrink-0" />
            <button
              onClick={() => setActiveLabelId(undefined)}
              className={cn(
                "flex-shrink-0 px-2.5 py-0.5 rounded-full text-xs font-semibold transition-colors",
                !activeLabelId
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80",
              )}
            >
              All
            </button>
            {labels.map((label) => (
              <button
                key={label.id}
                onClick={() =>
                  setActiveLabelId(activeLabelId === label.id ? undefined : label.id)
                }
                className={cn(
                  "flex-shrink-0 flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold transition-all border-2",
                  activeLabelId === label.id
                    ? "border-current"
                    : "border-transparent opacity-70 hover:opacity-100",
                )}
                style={{ background: label.colorHex + "22", color: label.colorHex }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: label.colorHex }}
                />
                {label.name}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="mx-auto w-full max-w-5xl px-4 py-6">
        {search && notes !== undefined && (
          <p className="text-sm text-muted-foreground mb-4">
            {filteredNotes.length} result{filteredNotes.length !== 1 ? "s" : ""} for &ldquo;
            {search}&rdquo;
          </p>
        )}

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
        ) : filteredNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
              <StickyNote size={28} className="text-muted-foreground" />
            </div>
            <h3 className="mb-1 text-lg font-bold">
              {search || activeLabelId || activeBoardId
                ? "No notes found"
                : "No demo notes yet"}
            </h3>
            <p className="mb-6 text-sm text-muted-foreground">
              {search
                ? "Try different keywords"
                : activeLabelId || activeBoardId
                  ? "No notes match the current filter"
                  : "Press + to try the full note editor without signing in"}
            </p>
            {!search && (
              <Button
                onClick={() => setNoteModal({ mode: "create", boardId: activeBoardId })}
                className="rounded-xl"
              >
                <Plus size={16} className="mr-1" /> New Note
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {pinnedNotes.length > 0 && (
              <section aria-label="Pinned notes">
                <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                  <span className="w-4 h-0.5 bg-muted-foreground/40 rounded" />
                  Pinned
                  <span className="w-4 h-0.5 bg-muted-foreground/40 rounded" />
                </h2>
                <NoteGrid noteList={pinnedNotes} />
              </section>
            )}
            {unpinnedNotes.length > 0 && (
              <section aria-label="Notes">
                {pinnedNotes.length > 0 && (
                  <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                    <span className="w-4 h-0.5 bg-muted-foreground/40 rounded" />
                    Others
                    <span className="w-4 h-0.5 bg-muted-foreground/40 rounded" />
                  </h2>
                )}
                <NoteGrid noteList={unpinnedNotes} />
              </section>
            )}
          </div>
        )}
      </main>

      {/* FAB */}
      <button
        onClick={() => setNoteModal({ mode: "create", boardId: activeBoardId })}
        className="fixed right-6 bottom-6 z-30 flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-2xl transition-all duration-250 hover:scale-110 hover:rotate-90 active:scale-95"
        aria-label="New note"
      >
        <Plus size={26} />
      </button>

      {/* Backdrop for board menu */}
      {showBoardMenu && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setShowBoardMenu(false)}
          aria-hidden="true"
        />
      )}

      {/* Modals */}
      {noteModal && (
        <NoteModal
          demo
          note={noteModal.mode === "edit" ? toDraft(noteModal.note) : null}
          onSave={handleSaveNote}
          onClose={closeNoteModal}
        />
      )}
      {boardModal && (
        <BoardModal
          board={boardModal.mode === "edit" ? boardModal.board : null}
          onSave={handleSaveBoard}
          onClose={() => setBoardModal(null)}
        />
      )}
    </div>
  );
}
