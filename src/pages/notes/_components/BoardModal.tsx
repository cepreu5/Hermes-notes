import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { cn } from "@/lib/utils.ts";
import { BOARD_COLORS } from "@/lib/note-colors.ts";

// Editable shape shared by database boards and local demo boards
export type BoardDraft = {
  name: string;
  colorIndex: number;
};

type Props = {
  board?: BoardDraft | null;
  onSave: (data: { name: string; colorIndex: number }) => void;
  onClose: () => void;
};

export default function BoardModal({ board, onSave, onClose }: Props) {
  const [name, setName] = useState(board?.name ?? "");
  const [colorIndex, setColorIndex] = useState(board?.colorIndex ?? 0);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({ name: name.trim(), colorIndex });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal-enter w-full max-w-sm bg-card rounded-3xl shadow-2xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg">{board ? "Edit Board" : "New Board"}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors">
            <X size={16} />
          </button>
        </div>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Board name..."
          className="rounded-xl"
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
          autoFocus
        />
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Color</p>
          <div className="flex gap-2 flex-wrap">
            {BOARD_COLORS.map((c, i) => (
              <button
                key={i}
                onClick={() => setColorIndex(i)}
                className={cn(
                  "w-7 h-7 rounded-full border-2 transition-transform hover:scale-125",
                  colorIndex === i ? "border-foreground scale-125" : "border-transparent"
                )}
                style={{ background: c.bg }}
                aria-label={c.label}
                title={c.label}
              />
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose} className="rounded-xl">Cancel</Button>
          <Button onClick={handleSave} disabled={!name.trim()} className="rounded-xl">
            {board ? "Save" : "Create"}
          </Button>
        </div>
      </div>
    </div>
  );
}
