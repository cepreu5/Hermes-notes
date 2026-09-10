import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Plus, X, Pencil, Check } from "lucide-react";
import { Input } from "@/components/ui/input.tsx";
import { Button } from "@/components/ui/button.tsx";
import { cn } from "@/lib/utils.ts";
import type { Doc, Id } from "@/convex/_generated/dataModel.d.ts";

const LABEL_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#06b6d4", "#6366f1", "#ec4899", "#8b5cf6",
  "#14b8a6", "#64748b",
];

type Props = {
  selectedIds: Id<"labels">[];
  onChange: (ids: Id<"labels">[]) => void;
};

export default function LabelPicker({ selectedIds, onChange }: Props) {
  const labels = useQuery(api.labels.list) ?? [];
  const createLabel = useMutation(api.labels.create);
  const updateLabel = useMutation(api.labels.update);
  const removeLabel = useMutation(api.labels.remove);

  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(LABEL_COLORS[0]);
  const [editing, setEditing] = useState<Doc<"labels"> | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  const toggle = (id: Id<"labels">) => {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id]
    );
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const id = await createLabel({ name: newName.trim(), colorHex: newColor });
    onChange([...selectedIds, id]);
    setNewName("");
    setAdding(false);
  };

  const startEdit = (label: Doc<"labels">, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditing(label);
    setEditName(label.name);
    setEditColor(label.colorHex);
  };

  const handleUpdate = async () => {
    if (!editing || !editName.trim()) return;
    await updateLabel({ labelId: editing._id, name: editName.trim(), colorHex: editColor });
    setEditing(null);
  };

  const handleRemove = async (id: Id<"labels">, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedIds.filter((x) => x !== id));
    await removeLabel({ labelId: id });
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Labels</p>

      <div className="flex flex-wrap gap-1.5">
        {labels.map((label) => {
          const selected = selectedIds.includes(label._id);
          if (editing?._id === label._id) {
            return (
              <div key={label._id} className="flex items-center gap-1 p-1 rounded-xl bg-black/10" onClick={(e) => e.stopPropagation()}>
                <div className="flex gap-1">
                  {LABEL_COLORS.map((c) => (
                    <button key={c} type="button" onClick={() => setEditColor(c)}
                      className={cn("w-4 h-4 rounded-full border-2 transition-transform hover:scale-110", editColor === c ? "border-gray-700" : "border-transparent")}
                      style={{ background: c }} />
                  ))}
                </div>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)}
                  className="h-6 text-xs px-1.5 rounded-lg w-20 bg-white/80 border-0"
                  onKeyDown={(e) => { if (e.key === "Enter") handleUpdate(); if (e.key === "Escape") setEditing(null); }}
                  autoFocus />
                <button type="button" onClick={handleUpdate} className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-black/10"><Check size={11} /></button>
                <button type="button" onClick={() => setEditing(null)} className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-black/10"><X size={11} /></button>
              </div>
            );
          }
          return (
            <div key={label._id} className="group flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => toggle(label._id)}
                className={cn(
                  "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold transition-all border-2",
                  selected ? "border-gray-700 opacity-100" : "border-transparent opacity-70 hover:opacity-100"
                )}
                style={{ background: label.colorHex + "33", color: label.colorHex }}
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: label.colorHex }} />
                {label.name}
                {selected && <Check size={10} />}
              </button>
              <button type="button" onClick={(e) => startEdit(label, e)} className="opacity-0 group-hover:opacity-100 w-4 h-4 flex items-center justify-center rounded-full hover:bg-black/10 transition-all"><Pencil size={9} /></button>
              <button type="button" onClick={(e) => handleRemove(label._id, e)} className="opacity-0 group-hover:opacity-100 w-4 h-4 flex items-center justify-center rounded-full hover:bg-red-200 transition-all"><X size={9} /></button>
            </div>
          );
        })}

        {adding ? (
          <div className="flex items-center gap-1 p-1 rounded-xl bg-black/10" onClick={(e) => e.stopPropagation()}>
            <div className="flex gap-1">
              {LABEL_COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setNewColor(c)}
                  className={cn("w-4 h-4 rounded-full border-2 transition-transform hover:scale-110", newColor === c ? "border-gray-700" : "border-transparent")}
                  style={{ background: c }} />
              ))}
            </div>
            <Input value={newName} onChange={(e) => setNewName(e.target.value)}
              placeholder="Label name..." className="h-6 text-xs px-1.5 rounded-lg w-24 bg-white/80 border-0"
              onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") setAdding(false); }}
              autoFocus />
            <button type="button" onClick={handleCreate} className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-black/10"><Check size={11} /></button>
            <button type="button" onClick={() => setAdding(false)} className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-black/10"><X size={11} /></button>
          </div>
        ) : (
          <button type="button" onClick={() => setAdding(true)}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold text-gray-600 bg-black/10 hover:bg-black/20 transition-colors">
            <Plus size={11} /> Add label
          </button>
        )}
      </div>
    </div>
  );
}

// Small badge used in cards and filter bar
export function LabelBadge({ label }: { label: Pick<Doc<"labels">, "name" | "colorHex"> }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold"
      style={{ background: label.colorHex + "33", color: label.colorHex }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: label.colorHex }} />
      {label.name}
    </span>
  );
}
