import { useEffect, useState } from "react";
import { Plus, X, Pencil, Check } from "lucide-react";
import { cn } from "@/lib/utils.ts";
import {
  deleteDemoLabel,
  listDemoLabels,
  putDemoLabel,
  type DemoLabel,
} from "@/lib/demo-notes-db.ts";

const LABEL_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#06b6d4", "#6366f1", "#ec4899", "#8b5cf6",
  "#14b8a6", "#64748b",
];

type Props = {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
};

/** Same UX as the signed-in LabelPicker, but stored in IndexedDB for demo mode. */
export default function DemoLabelPicker({ selectedIds, onChange }: Props) {
  const [labels, setLabels] = useState<DemoLabel[]>([]);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(LABEL_COLORS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const rows = await listDemoLabels();
      if (!cancelled) setLabels(rows);
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  const toggle = (id: string) => {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id],
    );
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const label: DemoLabel = {
      id: crypto.randomUUID(),
      name: newName.trim(),
      colorHex: newColor,
      createdAt: new Date().toISOString(),
    };
    await putDemoLabel(label);
    setLabels((prev) => [...prev, label]);
    onChange([...selectedIds, label.id]);
    setNewName("");
    setAdding(false);
  };

  const startEdit = (label: DemoLabel, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(label.id);
    setEditName(label.name);
    setEditColor(label.colorHex);
  };

  const handleUpdate = async () => {
    const current = labels.find((l) => l.id === editingId);
    if (!current || !editName.trim()) return;
    const updated: DemoLabel = { ...current, name: editName.trim(), colorHex: editColor };
    await putDemoLabel(updated);
    setLabels((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    setEditingId(null);
  };

  const handleRemove = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedIds.filter((x) => x !== id));
    await deleteDemoLabel(id);
    setLabels((prev) => prev.filter((l) => l.id !== id));
  };

  // Hardcoded dark color so text is always readable on light pastel note backgrounds
  const inputStyle: React.CSSProperties = { color: "#111", caretColor: "#111" };

  return (
    <div className="space-y-2">
      <p className="mb-1 text-xs font-semibold tracking-wide text-gray-600 uppercase">Labels</p>

      <div className="flex flex-wrap gap-1.5">
        {labels.map((label) => {
          const selected = selectedIds.includes(label.id);
          if (editingId === label.id) {
            return (
              <div key={label.id} className="flex items-center gap-1 rounded-xl bg-black/10 p-1" onClick={(e) => e.stopPropagation()}>
                <div className="flex gap-1">
                  {LABEL_COLORS.map((c) => (
                    <button key={c} type="button" onClick={() => setEditColor(c)}
                      className={cn("h-4 w-4 rounded-full border-2 transition-transform hover:scale-110", editColor === c ? "border-gray-700" : "border-transparent")}
                      style={{ background: c }} />
                  ))}
                </div>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-6 w-20 rounded-lg border-0 bg-white/80 px-1.5 text-xs outline-none focus:ring-2 focus:ring-gray-400 placeholder:text-gray-400"
                  style={inputStyle}
                  onKeyDown={(e) => { if (e.key === "Enter") void handleUpdate(); if (e.key === "Escape") setEditingId(null); }}
                  autoFocus
                />
                <button type="button" onClick={() => void handleUpdate()} className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-black/10"><Check size={11} /></button>
                <button type="button" onClick={() => setEditingId(null)} className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-black/10"><X size={11} /></button>
              </div>
            );
          }
          return (
            <div key={label.id} className="group flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => toggle(label.id)}
                className={cn(
                  "flex items-center gap-1 rounded-full border-2 px-2 py-0.5 text-xs font-semibold transition-all",
                  selected ? "border-gray-700 opacity-100" : "border-transparent opacity-70 hover:opacity-100",
                )}
                style={{ background: label.colorHex + "33", color: label.colorHex }}
              >
                <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: label.colorHex }} />
                {label.name}
                {selected && <Check size={10} />}
              </button>
              <button type="button" onClick={(e) => startEdit(label, e)} className="flex h-4 w-4 items-center justify-center rounded-full opacity-0 transition-all group-hover:opacity-100 hover:bg-black/10"><Pencil size={9} /></button>
              <button type="button" onClick={(e) => void handleRemove(label.id, e)} className="flex h-4 w-4 items-center justify-center rounded-full opacity-0 transition-all group-hover:opacity-100 hover:bg-red-200"><X size={9} /></button>
            </div>
          );
        })}

        {adding ? (
          <div className="flex items-center gap-1 rounded-xl bg-black/10 p-1" onClick={(e) => e.stopPropagation()}>
            <div className="flex gap-1">
              {LABEL_COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setNewColor(c)}
                  className={cn("h-4 w-4 rounded-full border-2 transition-transform hover:scale-110", newColor === c ? "border-gray-700" : "border-transparent")}
                  style={{ background: c }} />
              ))}
            </div>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Label name..."
              className="h-6 w-24 rounded-lg border-0 bg-white/80 px-1.5 text-xs outline-none focus:ring-2 focus:ring-gray-400 placeholder:text-gray-400"
              style={inputStyle}
              onKeyDown={(e) => { if (e.key === "Enter") void handleCreate(); if (e.key === "Escape") setAdding(false); }}
              autoFocus
            />
            <button type="button" onClick={() => void handleCreate()} className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-black/10"><Check size={11} /></button>
            <button type="button" onClick={() => setAdding(false)} className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-black/10"><X size={11} /></button>
          </div>
        ) : (
          <button type="button" onClick={() => setAdding(true)}
            className="flex items-center gap-1 rounded-full bg-black/10 px-2 py-0.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-black/20">
            <Plus size={11} /> Add label
          </button>
        )}
      </div>
    </div>
  );
}
