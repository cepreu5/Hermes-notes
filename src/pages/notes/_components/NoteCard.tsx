import { Pin, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { NOTE_COLORS } from "@/lib/note-colors.ts";
import { LabelBadge } from "./LabelPicker.tsx";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";

type Props = {
  note: Doc<"notes">;
  labels: Doc<"labels">[];
  onEdit: (note: Doc<"notes">) => void;
  onDelete: (id: Doc<"notes">["_id"]) => void;
  onTogglePin: (id: Doc<"notes">["_id"]) => void;
  isNew?: boolean;
};

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export default function NoteCard({ note, labels, onEdit, onDelete, onTogglePin, isNew }: Props) {
  const color = NOTE_COLORS[note.colorIndex % NOTE_COLORS.length];
  const isHtml = note.content.startsWith("<");
  const preview = isHtml ? stripHtml(note.content) : note.content;
  const noteLabels = labels.filter((l) => note.labelIds?.includes(l._id));

  return (
    <div
      className={cn(
        "group relative rounded-2xl p-4 shadow-sm cursor-pointer select-none",
        "transition-all duration-200 ease-out",
        "hover:-translate-y-1.5 hover:shadow-lg hover:scale-[1.03] hover:rotate-[-0.5deg]",
        "active:scale-[0.97]",
        isNew && "note-appear"
      )}
      style={{ background: color.bg, minHeight: 130 }}
      onClick={() => onEdit(note)}
    >
      {note.isPinned && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-amber-400 rounded-full flex items-center justify-center shadow pulse-sync z-10">
          <Pin size={12} className="text-white fill-white" />
        </div>
      )}
      {note.title && (
        <p className="font-bold text-sm text-gray-800 mb-2 line-clamp-2 leading-tight">{note.title}</p>
      )}
      <p className="text-xs text-gray-700 line-clamp-4 leading-relaxed whitespace-pre-wrap">{preview}</p>
      {noteLabels.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {noteLabels.map((l) => <LabelBadge key={l._id} label={l} />)}
        </div>
      )}
      <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        <button
          className="w-7 h-7 rounded-full flex items-center justify-center bg-black/10 hover:bg-black/20 transition-colors"
          onClick={(e) => { e.stopPropagation(); onTogglePin(note._id); }}
          aria-label={note.isPinned ? "Unpin" : "Pin"}
        >
          <Pin size={13} className={note.isPinned ? "fill-amber-600 text-amber-600" : "text-gray-700"} />
        </button>
        <button
          className="w-7 h-7 rounded-full flex items-center justify-center bg-black/10 hover:bg-black/20 transition-colors"
          onClick={(e) => { e.stopPropagation(); onEdit(note); }}
          aria-label="Edit"
        >
          <Pencil size={13} className="text-gray-700" />
        </button>
        <button
          className="w-7 h-7 rounded-full flex items-center justify-center bg-black/10 hover:bg-red-400 transition-colors"
          onClick={(e) => { e.stopPropagation(); onDelete(note._id); }}
          aria-label="Delete"
        >
          <Trash2 size={13} className="text-gray-700 hover:text-white" />
        </button>
      </div>
    </div>
  );
}
