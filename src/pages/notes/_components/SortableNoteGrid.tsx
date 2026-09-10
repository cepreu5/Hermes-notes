import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import NoteCard from "./NoteCard.tsx";
import type { Doc, Id } from "@/convex/_generated/dataModel.d.ts";

type Props = {
  notes: Doc<"notes">[];
  labels: Doc<"labels">[];
  boards: Doc<"boards">[];
  onEdit: (note: Doc<"notes">) => void;
  onDelete: (id: Id<"notes">) => void;
  onTogglePin: (id: Id<"notes">) => void;
  onReorder?: (ids: Id<"notes">[]) => void;
  newNoteIds: Set<string>;
};

function SortableNote({
  note, labels, boards, onEdit, onDelete, onTogglePin, isNew,
}: {
  note: Doc<"notes">;
  labels: Doc<"labels">[];
  boards: Doc<"boards">[];
  onEdit: (note: Doc<"notes">) => void;
  onDelete: (id: Id<"notes">) => void;
  onTogglePin: (id: Id<"notes">) => void;
  isNew: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: note._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  } as React.CSSProperties;

  return (
    <div ref={setNodeRef} style={style} className="break-inside-avoid mb-4" {...attributes}>
      <div {...listeners} style={{ touchAction: "none" }}>
        <NoteCard note={note} labels={labels} boards={boards} onEdit={onEdit} onDelete={onDelete} onTogglePin={onTogglePin} isNew={isNew} />
      </div>
    </div>
  );
}

export default function SortableNoteGrid({ notes, labels, boards, onEdit, onDelete, onTogglePin, onReorder, newNoteIds }: Props) {
  const [items, setItems] = useState(() => notes.map((n) => n._id));

  const noteMap = new Map(notes.map((n) => [n._id, n]));
  const sortedNotes = items
    .filter((id) => noteMap.has(id))
    .concat(notes.filter((n) => !items.includes(n._id)).map((n) => n._id))
    .map((id) => noteMap.get(id)!)
    .filter(Boolean);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = items.indexOf(active.id as Id<"notes">);
    const newIdx = items.indexOf(over.id as Id<"notes">);
    const newOrder = arrayMove(items, oldIdx, newIdx);
    setItems(newOrder);
    onReorder?.(newOrder);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={sortedNotes.map((n) => n._id)} strategy={rectSortingStrategy}>
        <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-4">
          {sortedNotes.map((note) => (
            <SortableNote
              key={note._id}
              note={note}
              labels={labels}
              boards={boards}
              onEdit={onEdit}
              onDelete={onDelete}
              onTogglePin={onTogglePin}
              isNew={newNoteIds.has(note._id)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
