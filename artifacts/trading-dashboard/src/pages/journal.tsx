import { useState } from "react";
import { useListJournalEntries, useCreateJournalEntry, useDeleteJournalEntry, useUpdateJournalEntry } from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { BookOpen, Plus, Trash2, Edit2, TrendingUp, TrendingDown, Minus, Tag as TagIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const journalSchema = z.object({
  title: z.string().min(1, "Title is required"),
  notes: z.string().optional(),
  tags: z.string().optional(),
  sentiment: z.enum(["bullish", "bearish", "neutral"]).optional(),
  orderId: z.coerce.number().optional().nullable(),
});

type JournalFormValues = z.infer<typeof journalSchema>;

export default function Journal() {
  const { toast } = useToast();
  const { data: entries, refetch } = useListJournalEntries();
  const createEntry = useCreateJournalEntry();
  const updateEntry = useUpdateJournalEntry();
  const deleteEntry = useDeleteJournalEntry();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<JournalFormValues>({
    resolver: zodResolver(journalSchema),
    defaultValues: {
      sentiment: "neutral",
    }
  });

  const sentiment = watch("sentiment");

  const openNewForm = () => {
    setEditingId(null);
    reset({ title: "", notes: "", tags: "", sentiment: "neutral" });
    setIsFormOpen(true);
  };

  const openEditForm = (entry: any) => {
    setEditingId(entry.id);
    reset({
      title: entry.title,
      notes: entry.notes || "",
      tags: entry.tags || "",
      sentiment: entry.sentiment || "neutral",
      orderId: entry.orderId,
    });
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
  };

  const onSubmit = (data: JournalFormValues) => {
    // Clean up empty optional fields
    const payload = {
      ...data,
      notes: data.notes || undefined,
      tags: data.tags || undefined,
    };

    if (editingId) {
      updateEntry.mutate({ id: editingId, data: payload }, {
        onSuccess: () => {
          toast({ title: "Entry updated" });
          refetch();
          closeForm();
        }
      });
    } else {
      createEntry.mutate({ data: payload }, {
        onSuccess: () => {
          toast({ title: "Journal entry saved" });
          refetch();
          closeForm();
        }
      });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Delete this entry?")) {
      deleteEntry.mutate({ id }, {
        onSuccess: () => {
          toast({ title: "Entry deleted" });
          refetch();
        }
      });
    }
  };

  const SentimentIcon = ({ type, size = 16 }: { type?: string, size?: number }) => {
    if (type === 'bullish') return <TrendingUp size={size} className="text-success" />;
    if (type === 'bearish') return <TrendingDown size={size} className="text-destructive" />;
    return <Minus size={size} className="text-white/40" />;
  };

  return (
    <div className="space-y-6">
      
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-medium tracking-tight mb-1">Trade Journal</h2>
          <p className="text-sm text-white/40 font-mono">Document rationale, emotional state, and post-trade analysis.</p>
        </div>
        <button 
          onClick={openNewForm}
          className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-lg font-medium hover:bg-white/90 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.2)]"
        >
          <Plus size={18} />
          New Entry
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative items-start">
        
        {/* Entries List */}
        <motion.div 
          className={cn(
            "space-y-4 transition-all duration-300",
            isFormOpen ? "lg:col-span-7" : "lg:col-span-12"
          )}
        >
          {entries?.map((entry) => (
            <div key={entry.id} className="glass p-6 group hover:border-white/20 transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg border",
                    entry.sentiment === 'bullish' ? "bg-success/10 border-success/30" :
                    entry.sentiment === 'bearish' ? "bg-destructive/10 border-destructive/30" :
                    "bg-white/5 border-white/10"
                  )}>
                    <SentimentIcon type={entry.sentiment || 'neutral'} size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg leading-tight">{entry.title}</h3>
                    <div className="text-xs font-mono text-white/40 mt-1">
                      {format(new Date(entry.createdAt), 'MMM d, yyyy • HH:mm')}
                      {entry.orderId && <span className="ml-2 px-1.5 py-0.5 bg-white/10 rounded">Order #{entry.orderId}</span>}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEditForm(entry)} className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => handleDelete(entry.id)} className="p-1.5 text-white/40 hover:text-destructive hover:bg-destructive/10 rounded">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {entry.notes && (
                <div className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap pl-14">
                  {entry.notes}
                </div>
              )}

              {entry.tags && (
                <div className="flex flex-wrap gap-2 mt-4 pl-14">
                  {entry.tags.split(',').map(tag => (
                    <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-primary/10 border border-primary/20 text-primary rounded text-[10px] font-mono uppercase tracking-widest">
                      <TagIcon size={10} />
                      {tag.trim()}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}

          {entries?.length === 0 && (
            <div className="glass p-16 text-center flex flex-col items-center">
              <BookOpen size={32} className="text-white/20 mb-4" />
              <div className="text-white/40 font-mono text-sm uppercase tracking-widest mb-4">No journal entries yet</div>
              <button onClick={openNewForm} className="text-primary hover:text-primary/80 font-medium text-sm underline decoration-primary/30 underline-offset-4">
                Write your first entry
              </button>
            </div>
          )}
        </motion.div>

        {/* Sliding Form Panel */}
        <AnimatePresence>
          {isFormOpen && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20, transition: { duration: 0.2 } }}
              className="lg:col-span-5 glass p-6 sticky top-20"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-medium text-lg">{editingId ? 'Edit Entry' : 'New Entry'}</h3>
                <button onClick={closeForm} className="p-1 text-white/40 hover:text-white rounded-full hover:bg-white/10">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-mono tracking-widest text-white/40 uppercase">Title</label>
                  <input 
                    {...register("title")}
                    type="text"
                    className="w-full glass-input rounded-lg h-10 px-4 text-sm"
                    placeholder="e.g. FOMC Meeting Breakdown"
                  />
                  {errors.title && <span className="text-xs text-destructive">{errors.title.message}</span>}
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-mono tracking-widest text-white/40 uppercase">Market Sentiment</label>
                  <div className="flex gap-2">
                    {[
                      { val: "bullish", label: "Bullish", icon: TrendingUp, color: "text-success", bg: "bg-success" },
                      { val: "neutral", label: "Neutral", icon: Minus, color: "text-white/60", bg: "bg-white/40" },
                      { val: "bearish", label: "Bearish", icon: TrendingDown, color: "text-destructive", bg: "bg-destructive" }
                    ].map(s => (
                      <button
                        key={s.val}
                        type="button"
                        onClick={() => setValue("sentiment", s.val as any)}
                        className={cn(
                          "flex-1 py-2 flex items-center justify-center gap-2 rounded-lg border transition-all text-xs font-medium",
                          sentiment === s.val ? `border-${s.val === 'neutral' ? 'white/30' : s.val === 'bullish' ? 'success' : 'destructive'} bg-white/10 shadow-inner` : "border-white/5 bg-transparent text-white/40 hover:bg-white/5"
                        )}
                      >
                        <s.icon size={14} className={sentiment === s.val ? s.color : ""} />
                        <span className={sentiment === s.val ? "text-white" : ""}>{s.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-mono tracking-widest text-white/40 uppercase">Analysis / Notes</label>
                  <textarea 
                    {...register("notes")}
                    className="w-full glass-input rounded-lg p-4 text-sm min-h-[160px] resize-y"
                    placeholder="Document your thesis, technical setup, and emotional state..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-mono tracking-widest text-white/40 uppercase">Tags (comma separated)</label>
                  <input 
                    {...register("tags")}
                    type="text"
                    className="w-full glass-input rounded-lg h-10 px-4 text-sm font-mono text-primary"
                    placeholder="macro, breakout, revenge-trade"
                  />
                </div>

                <div className="pt-4 border-t border-white/10">
                  <button 
                    type="submit"
                    disabled={createEntry.isPending || updateEntry.isPending}
                    className="w-full py-3 bg-white text-black rounded-lg font-bold tracking-wide shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:bg-white/90 transition-all disabled:opacity-50"
                  >
                    {createEntry.isPending || updateEntry.isPending ? "Committing..." : "Commit Entry"}
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}
