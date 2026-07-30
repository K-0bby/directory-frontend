"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink, LockKeyhole, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import {
  ApiRequestError,
  createListingInternalNote,
  createListingSource,
  getListingInternalNotes,
  getListingSources,
  ListingInternalNote,
  ListingSource,
} from "@/lib/api";
import { RoleGuard } from "@/components/dashboard/role-guard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface AgentListingWorkspaceProps {
  slug: string;
}

const SOURCE_TYPES: Array<{
  value: ListingSource["source_type"];
  label: string;
}> = [
  { value: "official_website", label: "Official website" },
  { value: "official_social", label: "Official social" },
  { value: "government_registry", label: "Government registry" },
  { value: "reputable_directory", label: "Reputable directory" },
  { value: "ticket_platform", label: "Ticket platform" },
  { value: "news_source", label: "News source" },
  { value: "other", label: "Other" },
];

export default function AgentListingWorkspace({
  slug,
}: AgentListingWorkspaceProps) {
  const [sources, setSources] = useState<ListingSource[]>([]);
  const [notes, setNotes] = useState<ListingInternalNote[]>([]);
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceType, setSourceType] =
    useState<ListingSource["source_type"]>("official_website");
  const [sourcePrimary, setSourcePrimary] = useState(false);
  const [noteBody, setNoteBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingSource, setSavingSource] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = localStorage.getItem("authToken") ?? undefined;
    setLoading(true);
    setError(null);
    try {
      const [sourceData, noteData] = await Promise.all([
        getListingSources(slug, token),
        getListingInternalNotes(slug, token),
      ]);
      setSources(sourceData);
      setNotes(noteData);
      setReadOnly(false);
    } catch (loadError) {
      if (
        loadError instanceof ApiRequestError &&
        [403, 409].includes(loadError.status)
      ) {
        setReadOnly(true);
        setError(
          "Private operational data is no longer available. Ownership may have been handed over, stewardship may have ended, or your agent access may have changed.",
        );
      } else {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load listing operations",
        );
      }
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submitSource(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = localStorage.getItem("authToken") ?? undefined;
    setSavingSource(true);
    try {
      const source = await createListingSource(
        slug,
        {
          url: sourceUrl,
          source_type: sourceType,
          is_primary: sourcePrimary,
        },
        token,
      );
      setSources((current) => [...current, source]);
      setSourceUrl("");
      setSourcePrimary(false);
      toast.success("Source added");
    } catch (saveError) {
      toast.error(
        saveError instanceof Error ? saveError.message : "Could not add source",
      );
    } finally {
      setSavingSource(false);
    }
  }

  async function submitNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = localStorage.getItem("authToken") ?? undefined;
    setSavingNote(true);
    try {
      const note = await createListingInternalNote(slug, noteBody, token);
      setNotes((current) => [note, ...current]);
      setNoteBody("");
      toast.success("Internal note added");
    } catch (saveError) {
      toast.error(
        saveError instanceof Error ? saveError.message : "Could not add note",
      );
    } finally {
      setSavingNote(false);
    }
  }

  return (
    <RoleGuard allowedRoles={["listing_agent"]}>
      <div className="mx-auto w-full max-w-6xl space-y-6 px-3 py-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Button asChild variant="ghost" size="sm" className="-ml-3">
              <Link href="/dashboard/agent">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Agent workspace
              </Link>
            </Button>
            <h1 className="mt-2 text-2xl font-semibold">Listing operations</h1>
            <p className="text-sm text-slate-500">{slug}</p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => void load()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            {!readOnly && (
              <>
                <Button asChild variant="outline">
                  <Link
                    href={`/dashboard/agent/listings/${encodeURIComponent(slug)}/revision`}
                  >
                    Propose approved edit
                  </Link>
                </Button>
                <Button asChild>
                  <Link href={`/dashboard/my-listing/edit?slug=${encodeURIComponent(slug)}`}>
                    Edit draft or pending
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-48 items-center justify-center text-slate-500">
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            Loading private operations…
          </div>
        ) : error ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
            <div className="flex gap-3">
              <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">
                  {readOnly ? "Read-only history" : "Operations unavailable"}
                </p>
                <p className="mt-1 text-sm">{error}</p>
                {readOnly && (
                  <p className="mt-2 text-xs">
                    Claimant and new-owner identities are never exposed to listing
                    agents.
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-xl border bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold">Private sources</h2>
              <p className="mt-1 text-sm text-slate-500">
                Optionally record up to five sources for administrator reference.
                URLs remain private and a primary source is not required.
              </p>

              <form className="mt-5 space-y-3" onSubmit={submitSource}>
                <Input
                  type="url"
                  required
                  value={sourceUrl}
                  onChange={(event) => setSourceUrl(event.target.value)}
                  placeholder="https://official.example.org"
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <select
                    value={sourceType}
                    onChange={(event) =>
                      setSourceType(
                        event.target.value as ListingSource["source_type"],
                      )
                    }
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {SOURCE_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  <label className="flex h-10 items-center gap-2 rounded-md border px-3 text-sm">
                    <input
                      type="checkbox"
                      checked={sourcePrimary}
                      onChange={(event) => setSourcePrimary(event.target.checked)}
                    />
                    Primary source
                  </label>
                </div>
                <Button type="submit" disabled={savingSource || sources.length >= 5}>
                  <Plus className="mr-2 h-4 w-4" />
                  {savingSource ? "Adding…" : "Add source"}
                </Button>
              </form>

              <div className="mt-5 space-y-3">
                {sources.map((source) => (
                  <div key={source.id} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{source.domain}</p>
                        <p className="text-xs text-slate-500">
                          {source.source_type.replaceAll("_", " ")}
                          {source.is_primary ? " · Primary" : ""}
                        </p>
                      </div>
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Open ${source.domain}`}
                      >
                        <ExternalLink className="h-4 w-4 text-slate-500" />
                      </a>
                    </div>
                  </div>
                ))}
                {sources.length === 0 && (
                  <p className="text-sm text-amber-700">
                    Add a primary source before submitting this listing.
                  </p>
                )}
              </div>
            </section>

            <section className="rounded-xl border bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold">Internal notes</h2>
              <p className="mt-1 text-sm text-slate-500">
                Never public and never vendor-facing. Do not store unnecessary
                personal or sensitive information.
              </p>

              <form className="mt-5 space-y-3" onSubmit={submitNote}>
                <Textarea
                  required
                  minLength={2}
                  maxLength={10000}
                  rows={4}
                  value={noteBody}
                  onChange={(event) => setNoteBody(event.target.value)}
                  placeholder="Record an operational note…"
                />
                <Button type="submit" disabled={savingNote}>
                  <Plus className="mr-2 h-4 w-4" />
                  {savingNote ? "Adding…" : "Add note"}
                </Button>
              </form>

              <div className="mt-5 space-y-3">
                {notes.map((note) => (
                  <div key={note.id} className="rounded-lg border p-3">
                    <p className="whitespace-pre-wrap text-sm">
                      {note.body ?? "Note body purged under the retention policy."}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      {new Date(note.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
                {notes.length === 0 && (
                  <p className="text-sm text-slate-500">No internal notes.</p>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
