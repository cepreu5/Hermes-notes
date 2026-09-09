import { useState, useEffect, useRef } from "react";
import { X, Palette } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { cn } from "@/lib/utils.ts";
import { NOTE_COLORS } from "@/lib/note-colors.ts";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";

type Props = {
  note?: Doc<"notes"> | null;
  onSave: (data: { title: string; content: string; colorIndex: number }) => void;
  onClose: () => void;
};

export default function NoteModal({ note, onSave, onClose }: Props) {
  const [title, setTitle] = useState(note?.title ?? "");
  const [content, setContent] = useState(note?.content ?? "");
  const [colorIndex, setColorIndex] = useState(note?.colorIndex ?? 0);
  const [showPalette, setShowPalette] = useState(false);
  const [visible, setVisible] = useState(false);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const color = NOTE_COLORS[colorIndex % NOTE_COLORS.length];

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    contentRef.current?.focus();
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 200);
  };

  const handleSave = () => {
    if (!content.trim() && !title.trim()) { handleClose(); return; }
    onSave({ title: title.trim(), content: content.trim(), colorIndex });
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div
        className={cn(
          "relative w-full max-w-md rounded-3xl shadow-2xl flex flex-col overflow-hidden",
          visible ? "modal-enter" : "modal-exit"
        )}
        style={{ background: color.bg, minHeight: 320 }}
      >
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
        <textarea
          ref={contentRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write something..."
          rows={7}
          className="flex-1 bg-transparent px-5 py-2 text-sm text-gray-800 placeholder:text-gray-500 outline-none resize-none leading-relaxed"
        />
        <div className="flex items-center justify-between px-4 pb-4 pt-2">
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
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleClose} className="text-gray-700 hover:bg-black/10 rounded-xl">Cancel</Button>
            <Button size="sm" onClick={handleSave} className="rounded-xl bg-gray-800/80 hover:bg-gray-900 text-white">Save</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
