import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { NOTE_COLORS } from "@/lib/note-colors.ts";
import { downloadMarkdown } from "@/lib/note-to-markdown.ts";
import { Download, StickyNote, ArrowLeft, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { format } from "date-fns";

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export default function SharedNotePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const note = useQuery(api.sharedNotes.getByToken, token ? { token } : "skip");

  if (note === undefined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-2xl space-y-4">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>
      </div>
    );
  }

  if (note === null) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
          <StickyNote size={28} className="text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold">Note not found</h1>
        <p className="text-muted-foreground">This share link may have been removed or expired.</p>
        <Button onClick={() => navigate("/")} variant="secondary">
          <ArrowLeft size={15} className="mr-1" /> Go home
        </Button>
      </div>
    );
  }

  const color = NOTE_COLORS[note.colorIndex % NOTE_COLORS.length];
  const isHtml = note.content.trim().startsWith("<");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <StickyNote size={14} className="text-primary-foreground" />
          </div>
          <span className="font-extrabold text-base tracking-tight">CX Notes</span>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full ml-1">Shared note</span>
          <div className="ml-auto">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => downloadMarkdown(note.title, note.content, note.dueDate)}
              className="rounded-xl gap-1.5"
            >
              <Download size={13} /> Download .md
            </Button>
          </div>
        </div>
      </header>

      {/* Note content */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
        <div className="rounded-3xl shadow-lg overflow-hidden" style={{ background: color.bg }}>
          <div className="px-8 py-6">
            {note.title && (
              <h1 className="text-2xl font-extrabold text-gray-800 mb-4">{note.title}</h1>
            )}
            {note.dueDate && (
              <div className="flex items-center gap-1.5 mb-4">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-black/10 text-gray-700">
                  <Calendar size={11} />
                  Due {format(new Date(note.dueDate), "PPP")}
                </span>
              </div>
            )}
            {isHtml ? (
              <div
                className="prose prose-sm max-w-none text-gray-800"
                dangerouslySetInnerHTML={{ __html: note.content }}
              />
            ) : (
              <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">{note.content}</p>
            )}
          </div>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-6">
          Shared via <span className="font-semibold">CX Notes</span>
        </p>
      </main>
    </div>
  );
}
