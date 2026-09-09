import { useState, useCallback, useId } from "react";
import { useQuery, useMutation } from "convex/react";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { Plus, Search, X, StickyNote, LayoutGrid, ChevronDown, Pencil, Trash2, LogOut, WifiOff, Moon, Sun, Download } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import { useAuth } from "@/hooks/use-auth.ts";
import { useOnlineStatus } from "@/hooks/use-online-status.ts";
import { BOARD_COLORS } from "@/lib/note-colors.ts";
import SortableNoteGrid from "./_components/SortableNoteGrid.tsx";
import NoteModal from "./_components/NoteModal.tsx";
import BoardModal from "./_components/BoardModal.tsx";
import type { Doc, Id } from "@/convex/_generated/dataModel.d.ts";

type NoteModalState = { mode: "create"; boardId?: Id<"boards"> } | { mode: "edit"; note: Doc<"notes"> } | null;
type BoardModalState = { mode: "create" } | { mode: "edit"; board: Doc<"boards"> } | null;

function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-8 text-center">
      <div className="fade-in-up space-y-6 max-w-md">
        <div className="w-20 h-20 rounded-3xl bg-primary flex items-center justify-center mx-auto shadow-xl">
          <StickyNote size={40} className="text-primary-foreground" />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-balance">CX Notes</h1>
        <p className="text-muted-foreground text-lg">Your notes, organized in boards. Fast, secure, everywhere.</p>
        <SignInButton className="rounded-2xl px-8 py-3 text-base font-bold shadow-lg" />
      </div>
    </div>
  );
}

function useDarkMode() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };
  return { dark, toggle };
}

function useInstallPrompt() {
  const [prompt, setPrompt] = useState<(Event & { prompt?: () => void }) | null>(null);
  useState(() => {
    const handler = (e: Event) => { e.preventDefault(); setPrompt(e as Event & { prompt?: () => void }); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  });
  const install = () => { (prompt as { prompt: () => void })?.prompt?.(); setPrompt(null); };
  return { canInstall: !!prompt, install };
}

function NotesAppInner() {
  const { signout } = useAuth();
  const isOnline = useOnlineStatus();
  const { dark, toggle: toggleDark } = useDarkMode();
  const { canInstall, install } = useInstallPrompt();
  const [activeBoardId, setActiveBoardId] = useState<Id<"boards"> | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [noteModal, setNoteModal] = useState<NoteModalState>(null);
  const [boardModal, setBoardModal] = useState<BoardModalState>(null);
  const [newNoteIds, setNewNoteIds] = useState<Set<string>>(new Set());
  const [showBoardMenu, setShowBoardMenu] = useState(false);
  const searchId = useId();

  const boards = useQuery(api.boards.list);
  const notes = useQuery(api.notes.list, search ? "skip" : { boardId: activeBoardId });
  const searchResults = useQuery(api.notes.search, search ? { query: search } : "skip");
  const currentUser = useQuery(api.users.getCurrentUserQuery);

  const createNote = useMutation(api.notes.create);
  const updateNote = useMutation(api.notes.update);
  const deleteNote = useMutation(api.notes.remove);
  const togglePin = useMutation(api.notes.togglePin);
  const createBoard = useMutation(api.boards.create);
  const updateBoard = useMutation(api.boards.update);
  const deleteBoard = useMutation(api.boards.remove);

  const displayNotes = search ? searchResults : notes;
  const pinnedNotes = displayNotes?.filter((n) => n.isPinned) ?? [];
  const unpinnedNotes = displayNotes?.filter((n) => !n.isPinned) ?? [];
  const activeBoard = boards?.find((b) => b._id === activeBoardId);

  const handleSaveNote = useCallback(
    async (data: { title: string; content: string; colorIndex: number }) => {
      try {
        if (noteModal?.mode === "edit") {
          await updateNote({ noteId: noteModal.note._id, ...data });
          toast.success("Note saved");
        } else {
          const id = await createNote({ boardId: noteModal?.mode === "create" ? noteModal.boardId : activeBoardId, ...data });
          setNewNoteIds((prev) => new Set(prev).add(id));
          setTimeout(() => setNewNoteIds((prev) => { const s = new Set(prev); s.delete(id); return s; }), 1000);
          toast.success("Note created");
        }
      } catch (err) {
        const msg = err instanceof ConvexError ? (err.data as { message: string }).message : "Error";
        toast.error(msg);
      }
    },
    [noteModal, activeBoardId, createNote, updateNote]
  );

  const handleDeleteNote = useCallback(async (noteId: Id<"notes">) => {
    try { await deleteNote({ noteId }); toast.success("Note deleted"); }
    catch { toast.error("Error deleting note"); }
  }, [deleteNote]);

  const handleTogglePin = useCallback(async (noteId: Id<"notes">) => { await togglePin({ noteId }); }, [togglePin]);

  const handleSaveBoard = useCallback(async (data: { name: string; colorIndex: number }) => {
    try {
      if (boardModal?.mode === "edit") { await updateBoard({ boardId: boardModal.board._id, ...data }); toast.success("Board updated"); }
      else { await createBoard(data); toast.success("Board created"); }
    } catch { toast.error("Error saving board"); }
  }, [boardModal, createBoard, updateBoard]);

  const handleDeleteBoard = useCallback(async (boardId: Id<"boards">) => {
    try { await deleteBoard({ boardId }); if (activeBoardId === boardId) setActiveBoardId(undefined); toast.success("Board deleted"); }
    catch { toast.error("Error deleting board"); }
  }, [deleteBoard, activeBoardId]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-md border-b border-border shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow">
              <StickyNote size={16} className="text-primary-foreground" />
            </div>
            <span className="font-extrabold text-lg tracking-tight hidden sm:block">CX Notes</span>
          </div>
          <div className="relative flex-1 max-w-sm">
            <label htmlFor={searchId} className="sr-only">Search</label>
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input id={searchId} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search notes..." className="pl-9 pr-8 rounded-xl bg-muted border-0 focus-visible:ring-2" />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center hover:bg-muted-foreground/20 transition-colors" aria-label="Clear search">
                <X size={12} />
              </button>
            )}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <button onClick={() => setShowBoardMenu((v) => !v)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-muted transition-colors text-sm font-semibold" aria-expanded={showBoardMenu} aria-haspopup="true">
                <LayoutGrid size={16} />
                <span className="hidden sm:block max-w-[100px] truncate">{activeBoard?.name ?? "All"}</span>
                <ChevronDown size={14} className={`transition-transform ${showBoardMenu ? "rotate-180" : ""}`} />
              </button>
              {showBoardMenu && (
                <div className="absolute right-0 top-full mt-1 w-64 bg-popover border border-border rounded-2xl shadow-xl z-50 py-2 fade-in-up" role="menu">
                  <button className="w-full text-left px-4 py-2.5 text-sm font-semibold hover:bg-muted transition-colors flex items-center gap-2" onClick={() => { setActiveBoardId(undefined); setShowBoardMenu(false); }} role="menuitem">
                    <span className="w-3 h-3 rounded-full bg-primary flex-shrink-0" />All notes
                  </button>
                  {boards?.map((board) => {
                    const bc = BOARD_COLORS[board.colorIndex % BOARD_COLORS.length];
                    return (
                      <div key={board._id} className="flex items-center group">
                        <button className="flex-1 text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors flex items-center gap-2" onClick={() => { setActiveBoardId(board._id); setShowBoardMenu(false); }} role="menuitem">
                          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: bc.bg }} />
                          <span className="truncate">{board.name}</span>
                        </button>
                        <button onClick={() => { setBoardModal({ mode: "edit", board }); setShowBoardMenu(false); }} className="p-2 opacity-0 group-hover:opacity-100 hover:text-primary transition-all" aria-label="Edit board"><Pencil size={13} /></button>
                        <button onClick={() => handleDeleteBoard(board._id)} className="p-2 opacity-0 group-hover:opacity-100 hover:text-destructive transition-all" aria-label="Delete board"><Trash2 size={13} /></button>
                      </div>
                    );
                  })}
                  <div className="border-t border-border mt-1 pt-1">
                    <button className="w-full text-left px-4 py-2.5 text-sm font-semibold text-primary hover:bg-muted transition-colors flex items-center gap-2" onClick={() => { setBoardModal({ mode: "create" }); setShowBoardMenu(false); }} role="menuitem">
                      <Plus size={14} />New Board
                    </button>
                  </div>
                </div>
              )}
            </div>
            <button onClick={toggleDark} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors" aria-label={dark ? "Light mode" : "Dark mode"}>
              {dark ? <Sun size={15} className="text-muted-foreground" /> : <Moon size={15} className="text-muted-foreground" />}
            </button>
            {canInstall && (
              <button onClick={install} className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition-colors" aria-label="Install app">
                <Download size={13} /> Install
              </button>
            )}
            {currentUser && (
              <div className="flex items-center gap-2">
                {currentUser.avatar ? (
                  <img src={currentUser.avatar} alt={currentUser.name ?? "User"} className="w-8 h-8 rounded-full object-cover border border-border" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold">{(currentUser.name ?? "U")[0].toUpperCase()}</div>
                )}
                <button onClick={() => signout()} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors" aria-label="Sign out">
                  <LogOut size={15} className="text-muted-foreground" />
                </button>
              </div>
            )}
          </div>
        </div>
        {activeBoard && (
          <div className="max-w-6xl mx-auto px-4 pb-2 flex items-center gap-2 fade-in-up">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full text-white" style={{ background: BOARD_COLORS[activeBoard.colorIndex % BOARD_COLORS.length].bg }}>
              <LayoutGrid size={11} />{activeBoard.name}
            </span>
            <button onClick={() => setActiveBoardId(undefined)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">x Show all</button>
          </div>
        )}
      </header>

      {!isOnline && (
        <div className="slide-down sticky top-[57px] z-30 flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-950 border-b border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-sm font-semibold">
          <WifiOff size={15} />
          Offline mode - changes will sync when reconnected
        </div>
      )}

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        {search && (
          <p className="text-sm text-muted-foreground mb-4 fade-in-up">
            {searchResults ? `${searchResults.length} results for "${search}"` : "Searching..."}
          </p>
        )}
        {displayNotes === undefined ? (
          <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-4 space-y-4">
            {Array.from({ length: 8 }).map((_, i) => (<Skeleton key={i} className="break-inside-avoid rounded-2xl" style={{ height: 120 + (i % 3) * 40 }} />))}
          </div>
        ) : displayNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center fade-in-up">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <StickyNote size={28} className="text-muted-foreground" />
            </div>
            <h3 className="font-bold text-lg mb-1">{search ? "No notes found" : "No notes yet"}</h3>
            <p className="text-muted-foreground text-sm mb-6">{search ? "Try different keywords" : "Press + to add a note"}</p>
            {!search && (
              <Button onClick={() => setNoteModal({ mode: "create", boardId: activeBoardId })} className="rounded-xl">
                <Plus size={16} className="mr-1" /> New Note
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {pinnedNotes.length > 0 && (
              <section aria-label="Pinned notes">
                <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                  <span className="w-4 h-0.5 bg-muted-foreground/40 rounded" />Pinned<span className="w-4 h-0.5 bg-muted-foreground/40 rounded" />
                </h2>
                <SortableNoteGrid notes={pinnedNotes} onEdit={(n) => setNoteModal({ mode: "edit", note: n })} onDelete={handleDeleteNote} onTogglePin={handleTogglePin} newNoteIds={newNoteIds} />
              </section>
            )}
            {unpinnedNotes.length > 0 && (
              <section aria-label="Notes">
                {pinnedNotes.length > 0 && (
                  <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                    <span className="w-4 h-0.5 bg-muted-foreground/40 rounded" />Others<span className="w-4 h-0.5 bg-muted-foreground/40 rounded" />
                  </h2>
                )}
                <SortableNoteGrid notes={unpinnedNotes} onEdit={(n) => setNoteModal({ mode: "edit", note: n })} onDelete={handleDeleteNote} onTogglePin={handleTogglePin} newNoteIds={newNoteIds} />
              </section>
            )}
          </div>
        )}
      </main>

      <button
        onClick={() => setNoteModal({ mode: "create", boardId: activeBoardId })}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-2xl flex items-center justify-center z-30 transition-all duration-250 hover:scale-110 hover:rotate-90 hover:shadow-primary/40 active:scale-95"
        aria-label="New note"
      >
        <Plus size={26} />
      </button>

      {showBoardMenu && <div className="fixed inset-0 z-40" onClick={() => setShowBoardMenu(false)} aria-hidden="true" />}

      {noteModal && (<NoteModal note={noteModal.mode === "edit" ? noteModal.note : null} onSave={handleSaveNote} onClose={() => setNoteModal(null)} />)}
      {boardModal && (<BoardModal board={boardModal.mode === "edit" ? boardModal.board : null} onSave={handleSaveBoard} onClose={() => setBoardModal(null)} />)}
    </div>
  );
}

export default function NotesApp() {
  return (
    <>
      <AuthLoading>
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent spin" />
        </div>
      </AuthLoading>
      <Unauthenticated><LandingPage /></Unauthenticated>
      <Authenticated><NotesAppInner /></Authenticated>
    </>
  );
}
