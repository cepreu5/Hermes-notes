import { useState, useEffect } from "react";
import { X, Palette, Calendar, Bell, BellOff, Download, Share2, Link, Check } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { cn } from "@/lib/utils.ts";
import { NOTE_COLORS } from "@/lib/note-colors.ts";
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
  /** Demo mode stores labels locally and hides sharing, which needs an account. */
  demo?: boolean;
};

// ISO UTC → "YYYY-MM-DD" in local time
function toDatePart(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// ISO UTC → "HH:mm" in local time
function toTimePart(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// "YYYY-MM-DD" + "HH:mm" → ISO UTC string (or undefined if either is empty)
function combineToUtc(date: string, time: string): string | undefined {
  if (!date) return undefined;
  const t = time || "00:00";
  return new Date(`${date}T${t}`).toISOString();
}

export default function NoteModal({ note, onSave, onClose, demo = false }: Props) {
  const [title, setTitle] = useState(note?.title ?? "");
  const [content, setContent] = useState(note?.content ?? "");
  const [colorIndex, setColorIndex] = useState(note?.colorIndex ?? 0);
  const [labelIds, setLabelIds] = useState<string[]>(note?.labelIds ?? []);

  // Due date stored as separate date + time strings for reliable 24h input
  const [dueDate, setDueDate] = useState(toDatePart(note?.dueDate));
  const [dueTime, setDueTime] = useState(toTimePart(note?.dueDate));

  // Reminder stored as separate date + time strings
  const [reminderDate, setReminderDate] = useState(toDatePart(note?.reminderAt));
  const [reminderTime, setReminderTime] = useState(toTimePart(note?.reminderAt));

  const [showPalette, setShowPalette] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const color = NOTE_COLORS[colorIndex % NOTE_COLORS.length];

  const dueDateUtc = combineToUtc(dueDate, dueTime);
  const reminderUtc = combineToUtc(reminderDate, reminderTime);
  const hasDue = !!dueDate;
  const hasReminder = !!reminderDate;

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
      dueDate: dueDateUtc,
      reminderAt: reminderUtc,
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

  const isExisting = !demo && !!note?._id;

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
            {/* Due date toggle */}
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
              {hasDue && dueDateUtc
                ? format(new Date(dueDateUtc), "MMM d, HH:mm")
                : "Add due date"}
            </button>
            {hasDue && (
              <button
                type="button"
                onClick={() => { setDueDate(""); setDueTime(""); }}
                className="w-5 h-5 rounded-full flex items-center justify-center bg-black/10 hover:bg-black/20 transition-colors"
                aria-label="Remove due date"
              >
                <X size={9} className="text-gray-700" />
              </button>
            )}

            {/* Reminder toggle */}
            <button
              type="button"
              onClick={() => {
                if (hasReminder) {
                  setReminderDate("");
                  setReminderTime("");
                } else {
                  // Default reminder = due date if set, otherwise now + 1h
                  if (dueDate) {
                    setReminderDate(dueDate);
                    setReminderTime(dueTime || "09:00");
                  } else {
                    const base = new Date(Date.now() + 60 * 60 * 1000);
                    setReminderDate(toDatePart(base.toISOString()));
                    setReminderTime(toTimePart(base.toISOString()));
                  }
                  setShowDatePicker(true);
                }
              }}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold transition-all border",
                hasReminder
                  ? "bg-amber-400/30 border-amber-500/30 text-amber-800"
                  : "bg-black/10 border-transparent text-gray-600 hover:bg-black/15"
              )}
            >
              {hasReminder ? <Bell size={13} /> : <BellOff size={13} />}
              {hasReminder && reminderUtc
                ? format(new Date(reminderUtc), "MMM d, HH:mm")
                : "Remind me"}
            </button>
            {hasReminder && (
              <button
                type="button"
                onClick={() => { setReminderDate(""); setReminderTime(""); }}
                className="w-5 h-5 rounded-full flex items-center justify-center bg-black/10 hover:bg-black/20 transition-colors"
                aria-label="Remove reminder"
              >
                <X size={9} className="text-gray-700" />
              </button>
            )}
          </div>

          {/* Date + time pickers — split to guarantee 24h time input */}
          {showDatePicker && (
            <div className="grid grid-cols-2 gap-3 fade-in-up" onClick={(e) => e.stopPropagation()}>
              {/* Due date */}
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase text-gray-600 tracking-wide">Due date</p>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-xl bg-white/70 px-2 py-1 text-xs text-gray-800 border-0 outline-none focus:ring-2 focus:ring-gray-400"
                />
                <input
                  type="time"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                  className="w-full rounded-xl bg-white/70 px-2 py-1 text-xs text-gray-800 border-0 outline-none focus:ring-2 focus:ring-gray-400"
                />
              </div>
              {/* Reminder */}
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase text-gray-600 tracking-wide">Reminder</p>
                <input
                  type="date"
                  value={reminderDate}
                  onChange={(e) => setReminderDate(e.target.value)}
                  className="w-full rounded-xl bg-white/70 px-2 py-1 text-xs text-gray-800 border-0 outline-none focus:ring-2 focus:ring-gray-400"
                />
                <input
                  type="time"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                  className="w-full rounded-xl bg-white/70 px-2 py-1 text-xs text-gray-800 border-0 outline-none focus:ring-2 focus:ring-gray-400"
                />
              </div>
            </div>
          )}
        </div>

        {/* Share link section — only for existing saved notes */}
        {isExisting && (
          <div className="px-5 py-2 border-t border-black/10">
            {shareToken ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600 font-semibold flex items-center gap-1">
                  <Link size={11} /> Shared
                </span>
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
              <button
                onClick={() => setShowPalette((p) => !p)}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-black/10 hover:bg-black/20 transition-colors"
                aria-label="Pick color"
              >
                <Palette size={15} className="text-gray-700" />
              </button>
              {showPalette && (
                <div
                  className="absolute bottom-10 left-0 flex gap-2 p-2 rounded-2xl shadow-lg z-10 fade-in-up"
                  style={{ background: "rgba(255,255,255,0.95)", backdropFilter: "blur(8px)" }}
                >
                  {NOTE_COLORS.map((c, i) => (
                    <button
                      key={i}
                      onClick={() => { setColorIndex(i); setShowPalette(false); }}
                      className={cn(
                        "w-6 h-6 rounded-full border-2 transition-transform hover:scale-125",
                        colorIndex === i ? "border-gray-700 scale-125" : "border-transparent"
                      )}
                      style={{ background: c.bg }}
                      aria-label={c.label}
                      title={c.label}
                    />
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => downloadMarkdown(title, content, dueDateUtc, reminderUtc)}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-black/10 hover:bg-black/20 transition-colors"
              aria-label="Download as Markdown"
              title="Download as Markdown"
            >
              <Download size={15} className="text-gray-700" />
            </button>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleClose} className="text-gray-700 hover:bg-black/10 rounded-xl">
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} className="rounded-xl bg-gray-800/80 hover:bg-gray-900 text-white">
              Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
