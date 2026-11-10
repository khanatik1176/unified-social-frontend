"use client";

import { BookOpen, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";

import { Alert, Badge, Button, Card, EmptyState, Field, Input, Modal, PageHeader, Spinner, Textarea, Toggle } from "@/components/ui";
import { errorMessage } from "@/lib/api";
import { useDeleteKnowledge, useKnowledge, useSaveKnowledge } from "@/lib/queries";
import type { KnowledgeEntry } from "@/lib/types";

export default function KnowledgePage() {
  const { data: entries, isPending, error } = useKnowledge();
  const [editing, setEditing] = useState<KnowledgeEntry | "new" | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");

  const categories = useMemo(
    () => [...new Set((entries ?? []).map((e) => e.category).filter(Boolean))].sort(),
    [entries],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (entries ?? []).filter(
      (e) =>
        (!category || e.category === category) &&
        (!q || `${e.question} ${e.answer} ${e.keywords}`.toLowerCase().includes(q)),
    );
  }, [entries, search, category]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8">
      <PageHeader
        title="Knowledge base"
        description="Everything the bot is allowed to tell customers: FAQs, products and prices, delivery, payment, policies."
        actions={
          <Button onClick={() => setEditing("new")}>
            <Plus className="size-4" /> Add entry
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search entries" className="pl-9" />
        </div>
        <div className="flex flex-wrap gap-1">
          {["", ...categories].map((c) => (
            <button
              key={c || "all"}
              onClick={() => setCategory(c)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium ${category === c ? "bg-brand-soft text-brand" : "text-muted hover:bg-surface-2"}`}
            >
              {c || "All"}
            </button>
          ))}
        </div>
      </div>

      {isPending ? (
        <Spinner />
      ) : error ? (
        <Alert>{errorMessage(error)}</Alert>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState icon={<BookOpen className="size-8" />} title={entries.length ? "No matching entries" : "Your knowledge base is empty"}>
            {!entries.length && (
              <>
                Add the questions customers ask most, e.g. prices, delivery charges, opening hours. Or run{" "}
                <code className="font-mono">python manage.py seed_demo</code> on the backend for examples.
              </>
            )}
          </EmptyState>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((entry) => (
            <EntryCard key={entry.id} entry={entry} onEdit={() => setEditing(entry)} />
          ))}
        </div>
      )}

      {editing && (
        <EntryForm
          entry={editing === "new" ? null : editing}
          categories={categories}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function EntryCard({ entry, onEdit }: { entry: KnowledgeEntry; onEdit: () => void }) {
  const save = useSaveKnowledge();
  const remove = useDeleteKnowledge();
  return (
    <Card className={`p-4 ${entry.is_active ? "" : "opacity-60"}`}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-ink">{entry.question}</p>
            {entry.category && <Badge tone="brand">{entry.category}</Badge>}
          </div>
          <p className="mt-1 text-sm whitespace-pre-wrap text-muted">{entry.answer}</p>
          {entry.keywords && <p className="mt-2 text-xs text-muted">Keywords: {entry.keywords}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Toggle
            checked={entry.is_active}
            onChange={(v) => save.mutate({ id: entry.id, data: { is_active: v } })}
            label="Active"
          />
          <Button variant="ghost" size="sm" onClick={onEdit} aria-label="Edit">
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Delete"
            className="text-danger!"
            onClick={() => confirm("Delete this entry?") && remove.mutate(entry.id)}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

function EntryForm({
  entry,
  categories,
  onClose,
}: {
  entry: KnowledgeEntry | null;
  categories: string[];
  onClose: () => void;
}) {
  const save = useSaveKnowledge();
  const [question, setQuestion] = useState(entry?.question ?? "");
  const [answer, setAnswer] = useState(entry?.answer ?? "");
  const [keywords, setKeywords] = useState(entry?.keywords ?? "");
  const [category, setCategory] = useState(entry?.category ?? "");

  function submit(e: FormEvent) {
    e.preventDefault();
    save.mutate(
      { id: entry?.id, data: { question, answer, keywords, category, is_active: entry?.is_active ?? true } },
      { onSuccess: onClose },
    );
  }

  return (
    <Modal open onClose={onClose} title={entry ? "Edit entry" : "Add knowledge entry"} wide>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Question or topic" hint="Write it the way a customer would ask.">
          <Input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="How much is delivery?" required />
        </Field>
        <Field label="Answer">
          <Textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={5}
            placeholder="Delivery is 60 taka inside Dhaka and 120 taka outside Dhaka."
            required
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Keywords" hint="Comma separated. Other words customers use (including Bangla/Banglish).">
            <Input value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="shipping, charge, delivery fee" />
          </Field>
          <Field label="Category">
            <Input value={category} onChange={(e) => setCategory(e.target.value)} list="kb-categories" placeholder="Delivery" />
            <datalist id="kb-categories">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
        </div>
        {save.isError && <Alert>{errorMessage(save.error)}</Alert>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={save.isPending}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  );
}
