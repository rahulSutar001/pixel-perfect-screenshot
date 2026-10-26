import { format } from "date-fns";
import { CalendarIcon, Loader2, Plus, StickyNote, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { useTracker } from "@/lib/tracker-store";

export function AnnotationsPanel() {
  const { annotations, addAnnotation, removeAnnotation, setZoom } = useTracker();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>();
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!date || !text.trim()) return;
    setSaving(true);
    try {
      await addAnnotation({ date_targeted: format(date, "yyyy-MM-dd"), annotation_text: text.trim().slice(0, 500) });
      toast.success("Annotation saved", { description: "Synced to the annotations table." });
      setOpen(false);
      setText("");
      setDate(undefined);
    } catch {
      toast.error("Could not save annotation");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b p-4">
        <div>
          <div className="font-medium">My annotations</div>
          <div className="text-xs text-muted-foreground">Notes appear as green markers on the chart</div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1">
              <Plus className="size-4" /> Add note
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New market annotation</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start gap-2 font-normal">
                    <CalendarIcon className="size-4" />
                    {date ? format(date, "dd MMM yyyy") : <span className="text-muted-foreground">Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    captionLayout="dropdown"
                    startMonth={new Date(2006, 0)}
                    endMonth={new Date(2026, 11)}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              <Textarea placeholder="e.g. RBI Rate Hike Announcement" value={text} maxLength={500} onChange={(e) => setText(e.target.value)} rows={4} />
            </div>
            <DialogFooter>
              <Button onClick={save} disabled={saving || !date || !text.trim()} className="gap-2">
                {saving && <Loader2 className="size-4 animate-spin" />}
                {saving ? "Saving…" : "Save to database"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {annotations.length === 0 ? (
        <div className="flex flex-col items-center gap-2 p-10 text-center text-muted-foreground">
          <StickyNote className="size-8 opacity-50" />
          <div className="text-sm">No annotations yet. Mark an event you care about.</div>
        </div>
      ) : (
        <ul className="divide-y">
          {annotations.map((a) => (
            <li key={a.id} className="group flex items-start gap-3 p-3 px-4">
              <button
                className="num shrink-0 rounded bg-secondary px-2 py-0.5 text-xs text-gain hover:bg-accent"
                onClick={() => {
                  const d = new Date(a.date_targeted);
                  const s = new Date(d);
                  s.setUTCDate(s.getUTCDate() - 120);
                  const e = new Date(d);
                  e.setUTCDate(e.getUTCDate() + 120);
                  setZoom({ start: s.toISOString().slice(0, 10), end: e.toISOString().slice(0, 10), label: a.date_targeted });
                }}
              >
                {a.date_targeted}
              </button>
              <span className="flex-1 text-sm">{a.annotation_text}</span>
              <button onClick={() => removeAnnotation(a.id)} className="text-muted-foreground opacity-0 transition-opacity hover:text-loss group-hover:opacity-100" aria-label="Delete">
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
