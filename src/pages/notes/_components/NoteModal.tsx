import { useState, useEffect } from "react";
import { X, Palette, Calendar, Bell, BellOff, Download, Share2, Link, Check, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { cn } from "@/lib/utils.ts";
import { NOTE_COLORS, BOARD_COLORS } from "@/lib/note-colors.ts";
import RichTextEditor from "./RichTextEditor.tsx";
import LabelPicker from "./LabelPicker.tsx";
import DemoLabelPicker from "../../demo/_components/DemoLabelPicker.tsx";
import { format } from "date-fns";
import { downloadMarkdown } from "@/lib/note-to-markdown.ts";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { toast } from "sonner";
import type { Doc, Id } from "@/convex/_generated/dataModel.d.ts";

// Editable shape shared by database notes and local demo notes
export type NoteDraft = {
  _id?: Id<"notes">;
  title: string;
  content: string;
  colorIndex: number;
  labelIds?: string[];
  dueDate?: string;
  reminderAt?: string;
};

type Props = {
  note?: Doc<"notes"> | NoteDraft | null;
  onSave: (data: {
    title: string;
    content: string;
    colorIndex: number;
    labelIds: Id<"labels">[];
    dueDate?: string;
    reminderAt?: string;
  }) => void;
  onClose: () => void;
  /** Board this note belongs to — shown as a badge in the footer. */
  boardInfo?: { name: string; colorIndex: number };
  /** Demo mode stores labels locally and hides sharing, which needs an account. */
  demo?: boolean;
};

function localInputToUtc(value: string): string | undefined {
  if (!value) return undefined;
  return new Date(value).toISOString();
}

function utcToLocalInput(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function NoteModal({ note, onSave, onClose, boardInfo, demo = false }: Props) {
  const [title, setTitle] = useState(note?.title ?? "");
  const [content, setContent] = useState(note?.content ?? "");
  const [colorIndex, setColorIndex] = useState(note?.colorIndex ?? 0);
  // Ids are Convex label ids when signed in, and local uuids in demo mode
  const [labelIds, setLabelIds] = useState<string[]>(note?.labelIds ?? []);
  const [dueDate, setDueDate] = useState(utcToLocalInput(note?.dueDate));
  const [reminderAt, setReminderAt] = useState(utcToLocalInput(note?.reminderAt));
  const [showPalette, setShowPalette] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const color = NOTE_COLORS[colorIndex % NOTE_COLORS.length];

  // Share link state — only available when editing an existing saved note
  const shareToken = useQuery(
    api.sharedNotes.getShareToken,
    !demo && note?._id ? { noteId: note._id } : "skip"
  );
  const createShareLink = useMutation(api.sharedNotes.createShareLink);
  const removeShareLink = useMutation(api.sharedNotes.removeShareLink);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 200);
  };

  const handleSave = () => {
    const isEmptyHtml = !content || content === "<p></p>" || content.trim() === "";
    if (isEmptyHtml && !title.trim()) { handleClose(); return; }
    onSave({
      title: title.trim(),
      content,
      colorIndex,
      labelIds: labelIds as Id<"labels">[],
      dueDate: localInputToUtc(dueDate),
      reminderAt: localInputToUtc(reminderAt),
    });
    handleClose();
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleSave();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const handleShare = async () => {
    if (!note?._id) return;
    try {
      const token = await createShareLink({ noteId: note._id });
      const url = `${window.location.origin}/share/${token}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Share link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to create share link");
    }
  };

  const handleCopyLink = async () => {
    if (!shareToken) return;
    const url = `${window.location.origin}/share/${shareToken}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRemoveShare = async () => {
    if (!note?._id) return;
    try {
      await removeShareLink({ noteId: note._id });
      toast.success("Share link removed");
    } catch {
      toast.error("Failed to remove share link");
    }
  };

  const hasDue = !!dueDate;
  const hasReminder = !!reminderAt;
  const isExisting = !demo && !!note?._id;
  const boardColor = boardInfo ? BOARD_COLORS[boardInfo.colorIndex % BOARD_COLORS.length] : undefined;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div
        className={cn(
          "relative w-full max-w-lg rounded-3xl shadow-2xl flex flex-col overflow-hidden",
          visible ? "modal-enter" : "modal-exit"
        )}
        style={{ background: color.bg, minHeight: 420, maxHeight: "92vh" }}
      >
        {/* Title */}
        <div className="flex items-center justify-between px-5 pt-5 pb-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title..."
            className="flex-1 bg-transparent font-bold text-lg text-gray-800 placeholder:text-gray-500 outline-none border-none"
          />
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-black/10 hover:bg-black/20 transition-colors ml-2"
            aria-label="Close"
          >
            <X size={16} className="text-gray-700" />
          </button>
        </div>

        {/* Rich Text Editor */}
        <RichTextEditor
          content={content}
          onChange={setContent}
          placeholder="Write something..."
          className="flex-1 overflow-hidden"
        />

        {/* Due date / reminder section */}
        <div className="px-5 py-2 border-t border-black/10 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setShowDatePicker((v) => !v)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold transition-all border",
                hasDue || hasReminder
                  ? "bg-gray-800/20 border-gray-700/30 text-gray-700"
                  : "bg-black/10 border-transparent text-gray-600 hover:bg-black/15"
              )}
            >
              <Calendar size={13} />
              {hasDue ? format(new Date(dueDate), "MMM d, HH:mm") : "Add due date"}
            </button>
            {hasDue && (
              <button type="button" onClick={() => setDueDate("")} className="w-5 h-5 rounded-full flex items-center justify-center bg-black/10 hover:bg-black/20 transition-colors" aria-label="Remove due date">
                <X size={9} className="text-gray-700" />
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (hasReminder) { setReminderAt(""); }
                else {
                  const base = dueDate ? new Date(dueDate) : new Date(Date.now() + 60 * 60 * 1000);
                  setReminderAt(utcToLocalInput(base.toISOString()));
                  setShowDatePicker(true);
                }
              }}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold transition-all border",
                hasReminder ? "bg-amber-400/30 border-amber-500/30 text-amber-800" : "bg-black/10 border-transparent text-gray-600 hover:bg-black/15"
              )}
            >
              {hasReminder ? <Bell size={13} /> : <BellOff size={13} />}
              {hasReminder ? format(new Date(reminderAt), "MMM d, HH:mm") : "Remind me"}
            </button>
            {hasReminder && (
              <button type="button" onClick={() => setReminderAt("")} className="w-5 h-5 rounded-full flex items-center justify-center bg-black/10 hover:bg-black/20 transition-colors" aria-label="Remove reminder">
                <X size={9} className="text-gray-700" />
              </button>
            )}
          </div>
          {showDatePicker && (
            <div className="grid grid-cols-2 gap-2 fade-in-up" onClick={(e) => e.stopPropagation()}>
              <div>
                <label className="text-[10px] font-bold uppercase text-gray-600 tracking-wide block mb-0.5">Due date</label>
                <input type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full rounded-xl bg-white/70 px-2 py-1 text-xs text-gray-800 border-0 outline-none focus:ring-2 focus:ring-gray-400" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-gray-600 tracking-wide block mb-0.5">Reminder</label>
                <input type="datetime-local" value={reminderAt} onChange={(e) => setReminderAt(e.target.value)} className="w-full rounded-xl bg-white/70 px-2 py-1 text-xs text-gray-800 border-0 outline-none focus:ring-2 focus:ring-gray-400" />
              </div>
            </div>
          )}
        </div>

        {/* Share link section — only for existing saved notes */}
        {isExisting && (
          <div className="px-5 py-2 border-t border-black/10">
            {shareToken ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600 font-semibold flex items-center gap-1"><Link size={11} /> Shared</span>
                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold bg-black/10 hover:bg-black/20 transition-colors text-gray-700"
                >
                  {copied ? <Check size={11} /> : <Link size={11} />}
                  {copied ? "Copied!" : "Copy link"}
                </button>
                <button
                  onClick={handleRemoveShare}
                  className="px-2 py-0.5 rounded-lg text-xs font-semibold bg-red-400/20 hover:bg-red-400/40 transition-colors text-red-700"
                >
                  Remove
                </button>
              </div>
            ) : (
              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-black/10 border-transparent text-gray-600 hover:bg-black/15 transition-all border"
              >
                <Share2 size={13} /> Create share link
              </button>
            )}
          </div>
        )}

        {/* Labels */}
        <div className="px-5 py-2 border-t border-black/10">
          {demo ? (
            <DemoLabelPicker selectedIds={labelIds} onChange={setLabelIds} />
          ) : (
            <LabelPicker
              selectedIds={labelIds as Id<"labels">[]}
              onChange={(ids) => setLabelIds(ids)}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 pb-4 pt-2 border-t border-black/10">
          <div className="flex items-center gap-2">
            <div className="relative">
              <button onClick={() => setShowPalette((p) => !p)} className="w-8 h-8 rounded-full flex items-center justify-center bg-black/10 hover:bg-black/20 transition-colors" aria-label="Pick color">
                <Palette size={15} className="text-gray-700" />
              </button>
              {showPalette && (
                <div className="absolute bottom-10 left-0 flex gap-2 p-2 rounded-2xl shadow-lg z-10 fade-in-up" style={{ background: "rgba(255,255,255,0.95)", backdropFilter: "blur(8px)" }}>
                  {NOTE_COLORS.map((c, i) => (
                    <button key={i} onClick={() => { setColorIndex(i); setShowPalette(false); }} className={cn("w-6 h-6 rounded-full border-2 transition-transform hover:scale-125", colorIndex === i ? "border-gray-700 scale-125" : "border-transparent")} style={{ background: c.bg }} aria-label={c.label} title={c.label} />
                  ))}
                </div>
              )}
            </div>
            {/* Download as Markdown */}
            <button
              onClick={() => downloadMarkdown(title, content, localInputToUtc(dueDate), localInputToUtc(reminderAt))}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-black/10 hover:bg-black/20 transition-colors"
              aria-label="Download as Markdown"
              title="Download as Markdown"
            >
              <Download size={15} className="text-gray-700" />
            </button>
            {/* Board badge */}
            {boardInfo && boardColor && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold text-white"
                style={{ background: boardColor.bg }}
              >
                <LayoutGrid size={10} />
                {boardInfo.name}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleClose} className="text-gray-700 hover:bg-black/10 rounded-xl">Cancel</Button>
            <Button size="sm" onClick={handleSave} className="rounded-xl bg-gray-800/80 hover:bg-gray-900 text-white">Save</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
