"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, Send, Save } from "lucide-react";
import { toast } from "sonner";

import {
  createListingContentRevision,
  getOpenListingRevision,
  ListingContentRevision,
  submitListingContentRevision,
  updateListingContentRevision,
} from "@/lib/api";
import { RoleGuard } from "@/components/dashboard/role-guard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

interface AgentContentRevisionProps {
  slug: string;
}

type RevisionForm = {
  name: string;
  bio: string;
  email: string;
  primary_phone: string;
  website: string;
  country: string;
  city: string;
  address: string;
  business_reg_num: string;
  registration_country: string;
  registration_authority: string;
};

const EMPTY_FORM: RevisionForm = {
  name: "",
  bio: "",
  email: "",
  primary_phone: "",
  website: "",
  country: "",
  city: "",
  address: "",
  business_reg_num: "",
  registration_country: "",
  registration_authority: "",
};

function formFromRevision(revision: ListingContentRevision): RevisionForm {
  const proposed = revision.proposed_changes;
  return Object.fromEntries(
    Object.keys(EMPTY_FORM).map((key) => [
      key,
      typeof proposed[key] === "string" ? proposed[key] : "",
    ]),
  ) as unknown as RevisionForm;
}

export default function AgentContentRevision({
  slug,
}: AgentContentRevisionProps) {
  const [revision, setRevision] = useState<ListingContentRevision | null>(null);
  const [form, setForm] = useState<RevisionForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = localStorage.getItem("authToken") ?? undefined;
    setLoading(true);
    setError(null);
    try {
      const existing = await getOpenListingRevision(slug, token);
      const loaded =
        existing ?? (await createListingContentRevision(slug, token));
      setRevision(loaded);
      setForm(formFromRevision(loaded));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not open an approved-listing revision",
      );
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  function change(field: keyof RevisionForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!revision) return;

    const proposedChanges = Object.fromEntries(
      Object.entries(form)
        .map(([key, value]) => [key, value.trim()])
        .filter(([, value]) => value !== ""),
    );
    if (Object.keys(proposedChanges).length === 0) {
      toast.error("Enter at least one proposed change.");
      return;
    }

    setSaving(true);
    try {
      const updated = await updateListingContentRevision(
        revision,
        proposedChanges,
        localStorage.getItem("authToken") ?? undefined,
      );
      setRevision(updated);
      setForm(formFromRevision(updated));
      toast.success("Revision saved. The public listing remains unchanged.");
    } catch (saveError) {
      toast.error(
        saveError instanceof Error
          ? saveError.message
          : "Could not save revision",
      );
    } finally {
      setSaving(false);
    }
  }

  async function submit() {
    if (!revision) return;
    setSaving(true);
    try {
      const updated = await submitListingContentRevision(
        revision,
        localStorage.getItem("authToken") ?? undefined,
      );
      setRevision(updated);
      toast.success("Revision submitted for moderation.");
    } catch (submitError) {
      toast.error(
        submitError instanceof Error
          ? submitError.message
          : "Could not submit revision",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <RoleGuard allowedRoles={["listing_agent"]}>
      <div className="mx-auto w-full max-w-4xl space-y-6 px-3 py-6 lg:px-8">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-3">
            <Link href={`/dashboard/agent/listings/${slug}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Listing operations
            </Link>
          </Button>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold">Approved-listing revision</h1>
            {revision && <Badge>{revision.status.replaceAll("_", " ")}</Badge>}
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Proposed content stays private until an administrator approves the
            latest revision version. The current approved listing remains public.
          </p>
        </div>

        {loading ? (
          <div className="flex min-h-48 items-center justify-center text-slate-500">
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            Opening revision…
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        ) : revision ? (
          <form className="space-y-5 rounded-xl border bg-white p-5" onSubmit={save}>
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
              Base listing content v{revision.base_content_version}; editing
              revision v{revision.revision_version}.
              {revision.status === "pending" &&
                " Every save changes the revision version, so a moderator must reload before deciding."}
            </div>

            {revision.moderation_reason && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
                Moderator feedback: {revision.moderation_reason}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1 text-sm font-medium">
                Listing name
                <Input
                  value={form.name}
                  onChange={(event) => change("name", event.target.value)}
                  placeholder="Leave blank if unchanged"
                />
              </label>
              <label className="space-y-1 text-sm font-medium">
                Public email
                <Input
                  type="email"
                  value={form.email}
                  onChange={(event) => change("email", event.target.value)}
                  placeholder="Leave blank if unchanged"
                />
              </label>
              <label className="space-y-1 text-sm font-medium">
                Public phone
                <Input
                  value={form.primary_phone}
                  onChange={(event) =>
                    change("primary_phone", event.target.value)
                  }
                  placeholder="Leave blank if unchanged"
                />
              </label>
              <label className="space-y-1 text-sm font-medium">
                Website
                <Input
                  type="url"
                  value={form.website}
                  onChange={(event) => change("website", event.target.value)}
                  placeholder="https://…"
                />
              </label>
              <label className="space-y-1 text-sm font-medium">
                Country
                <Input
                  value={form.country}
                  onChange={(event) => change("country", event.target.value)}
                  placeholder="Leave blank if unchanged"
                />
              </label>
              <label className="space-y-1 text-sm font-medium">
                City
                <Input
                  value={form.city}
                  onChange={(event) => change("city", event.target.value)}
                  placeholder="Leave blank if unchanged"
                />
              </label>
              <label className="space-y-1 text-sm font-medium sm:col-span-2">
                Address
                <Input
                  value={form.address}
                  onChange={(event) => change("address", event.target.value)}
                  placeholder="Leave blank if unchanged"
                />
              </label>
              <label className="space-y-1 text-sm font-medium">
                Registration number
                <Input
                  value={form.business_reg_num}
                  onChange={(event) =>
                    change("business_reg_num", event.target.value)
                  }
                  placeholder="Leave blank if unchanged"
                />
              </label>
              <label className="space-y-1 text-sm font-medium">
                Registration country (ISO-2)
                <Input
                  value={form.registration_country}
                  maxLength={2}
                  onChange={(event) =>
                    change("registration_country", event.target.value.toUpperCase())
                  }
                  placeholder="GH"
                />
              </label>
              <label className="space-y-1 text-sm font-medium sm:col-span-2">
                Registration authority
                <Input
                  value={form.registration_authority}
                  onChange={(event) =>
                    change("registration_authority", event.target.value)
                  }
                  placeholder="Leave blank if unchanged"
                />
              </label>
              <label className="space-y-1 text-sm font-medium sm:col-span-2">
                Description
                <Textarea
                  value={form.bio}
                  onChange={(event) => change("bio", event.target.value)}
                  rows={6}
                  placeholder="Leave blank if unchanged"
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                Save proposed changes
              </Button>
              {(revision.status === "draft" ||
                revision.status === "changes_requested") && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={saving}
                  onClick={() => void submit()}
                >
                  <Send className="mr-2 h-4 w-4" />
                  {revision.status === "changes_requested"
                    ? "Resubmit latest version"
                    : "Submit for moderation"}
                </Button>
              )}
            </div>
          </form>
        ) : null}
      </div>
    </RoleGuard>
  );
}
