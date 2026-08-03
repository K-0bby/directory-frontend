"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { ArrowLeft, Bookmark, Briefcase, CalendarDays, Clock3, ExternalLink, Eye, Globe, LockKeyhole, Mail, MapPin, Pencil, Phone, Plus, RefreshCw, Star, Tag, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { RoleGuard } from "@/components/dashboard/role-guard";
import { ListingLocationCard } from "@/components/directory/listing-location-card";
import { ListingImageGallery } from "@/components/dashboard/listing/listing-image-gallery";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { RichTextDisplay } from "@/components/ui/rich-text-editor";
import { getImageUrl } from "@/lib/directory/image-utils";
import { formatEventDateRange, formatEventTimeRange } from "@/lib/directory/event-formatting";
import {
  createListingInternalNote,
  createListingService,
  createListingSource,
  deleteListingService,
  getListingInternalNotes,
  getListingManagement,
  getListingReviews,
  getListingSources,
  ListingInternalNote,
  ListingManagementData,
  ListingReview,
  ListingService,
  ListingSource,
  presignListingServiceImage,
  updateListingService,
} from "@/lib/api";

interface AgentListingWorkspaceProps { slug: string }
type WorkspaceTab = "details" | "services" | "reviews" | "operations";
const VALID_TABS: WorkspaceTab[] = ["details", "services", "reviews", "operations"];
const SOURCE_TYPES: Array<{ value: ListingSource["source_type"]; label: string }> = [
  { value: "official_website", label: "Official website" },
  { value: "official_social", label: "Official social" },
  { value: "government_registry", label: "Government registry" },
  { value: "reputable_directory", label: "Reputable directory" },
  { value: "ticket_platform", label: "Ticket platform" },
  { value: "news_source", label: "News source" },
  { value: "other", label: "Other" },
];

function message(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function humanize(value?: string | number | null): string | null {
  if (value === undefined || value === null || value === "") return null;
  return String(value).replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function externalHref(value?: string | number | null): string | null {
  if (value === undefined || value === null) return null;
  const candidate = String(value).trim();
  if (!candidate) return null;
  if (/^https?:\/\//i.test(candidate)) return candidate;
  if (/^[a-z][a-z\d+.-]*:/i.test(candidate)) return null;
  return `https://${candidate}`;
}

export default function AgentListingWorkspace({ slug }: AgentListingWorkspaceProps) {
  const [listing, setListing] = useState<ListingManagementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("details");
  const servicesSupported = listing?.type === "business" || listing?.type === "community";

  const loadListing = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      setListing(await getListingManagement(slug, localStorage.getItem("authToken") ?? undefined));
    } catch (loadError) {
      setError(message(loadError, "Could not load listing workspace"));
    } finally { setLoading(false); }
  }, [slug]);

  useEffect(() => { void loadListing(); }, [loadListing]);
  useEffect(() => {
    function syncTabFromUrl() {
      const requested = new URL(window.location.href).searchParams.get("tab");
      const next = VALID_TABS.includes(requested as WorkspaceTab)
        ? requested as WorkspaceTab
        : "details";
      setActiveTab(next);
    }
    syncTabFromUrl();
    window.addEventListener("popstate", syncTabFromUrl);
    return () => window.removeEventListener("popstate", syncTabFromUrl);
  }, []);
  useEffect(() => {
    if (!listing || (activeTab !== "services" || servicesSupported)) return;
    setActiveTab("details");
    const url = new URL(window.location.href);
    url.searchParams.set("tab", "details");
    window.history.replaceState(window.history.state, "", url);
  }, [activeTab, listing, servicesSupported]);

  function changeTab(value: string) {
    const next = VALID_TABS.includes(value as WorkspaceTab) ? value as WorkspaceTab : "details";
    setActiveTab(next);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", next);
    window.history.replaceState(window.history.state, "", url);
  }

  return (
    <RoleGuard allowedRoles={["listing_agent"]}>
      <div className="mx-auto w-full max-w-7xl space-y-6 px-3 py-6 lg:px-8">
        {loading ? <div className="flex min-h-64 items-center justify-center text-slate-500"><RefreshCw className="mr-2 h-5 w-5 animate-spin" />Loading listing workspace…</div>
        : error || !listing ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-950"><p className="font-semibold">Workspace unavailable</p><p className="mt-1 text-sm">{error}</p><Button className="mt-4" variant="outline" onClick={() => void loadListing()}>Retry</Button></div>
        : <>
          <header className="space-y-4 rounded-xl border bg-white p-5 shadow-sm">
            <Button asChild variant="ghost" size="sm" className="-ml-3"><Link href="/dashboard/agent"><ArrowLeft className="mr-2 h-4 w-4" />Agent workspace</Link></Button>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div><div className="flex flex-wrap gap-2"><span className="rounded-full bg-lime-100 px-2.5 py-1 text-xs font-medium capitalize text-lime-800">{listing.type}</span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium capitalize text-slate-700">{listing.status.replaceAll("_", " ")}</span>{listing.claim_status && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium capitalize text-slate-700">{listing.claim_status.replaceAll("_", " ")}</span>}</div><h1 className="mt-3 text-2xl font-semibold text-slate-950">{listing.name}</h1><p className="text-sm text-slate-500">Manage listing information from one workspace.</p></div>
              <div className="flex gap-2"><Button variant="outline" onClick={() => void loadListing()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>{listing.capabilities.can_edit && <Button asChild><Link href={`/dashboard/my-listing/edit?type=${listing.type}&slug=${encodeURIComponent(slug)}`}>Edit listing</Link></Button>}</div>
            </div>
            {listing.status === "approved" && listing.capabilities.can_edit && <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">Changes saved to this approved listing are published immediately.</p>}
            {!listing.capabilities.can_edit && <p className="flex items-center rounded-lg border bg-slate-50 px-3 py-2 text-sm text-slate-700"><LockKeyhole className="mr-2 h-4 w-4" />This listing is read-only. Stewardship, ownership, or listing status may have changed.</p>}
          </header>

          <Tabs value={activeTab} onValueChange={changeTab}>
            <TabsList className="h-auto w-full justify-start overflow-x-auto rounded-xl border bg-white p-1">
              <TabsTrigger value="details">Listing details</TabsTrigger>
              {servicesSupported && <TabsTrigger value="services">Services</TabsTrigger>}
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
              <TabsTrigger value="operations">Listing operations</TabsTrigger>
            </TabsList>
            <TabsContent forceMount value="details" className="mt-5 data-[state=inactive]:hidden"><ListingDetails listing={listing} /></TabsContent>
            {servicesSupported && <TabsContent forceMount value="services" className="mt-5 data-[state=inactive]:hidden"><ServicesPanel listing={listing} /></TabsContent>}
            <TabsContent forceMount value="reviews" className="mt-5 data-[state=inactive]:hidden"><ReviewsPanel slug={slug} /></TabsContent>
            <TabsContent forceMount value="operations" className="mt-5 data-[state=inactive]:hidden"><OperationsPanel slug={slug} canEdit={listing.capabilities.can_edit} /></TabsContent>
          </Tabs>
        </>}
      </div>
    </RoleGuard>
  );
}

function ListingDetails({ listing }: { listing: ListingManagementData }) {
  const media = [listing.cover, ...(listing.gallery ?? [])].filter((item): item is NonNullable<typeof item> => Boolean(item?.original) && item?.kind === "image");
  const imageUrls = media.map((item) => getImageUrl(item.card || item.webp || item.original));
  const categories = listing.categories?.map((category) => category.name).filter(Boolean).join(", ");
  const socialsValue = listing.socials as typeof listing.socials | Array<typeof listing.socials>;
  const socials = Array.isArray(socialsValue) ? socialsValue[0] : socialsValue;
  const event = listing.event ?? {};
  const eventValue = (key: string) => {
    const value = event[key];
    return typeof value === "string" || typeof value === "number" ? value : null;
  };
  const eventBoolean = (key: string) => event[key] === true;
  const eventStartDate = eventValue("event_start_date") ?? listing.event_start_date;
  const eventEndDate = eventValue("event_end_date") ?? listing.event_end_date;
  const eventStartTime = eventValue("event_start_time") ?? listing.event_start_time;
  const eventEndTime = eventValue("event_end_time") ?? listing.event_end_time;
  const eventTimezoneLabel = eventValue("timezone_label") ?? listing.event_timezone_label;
  const spansMultipleDays = eventBoolean("spans_multiple_days") || Boolean(eventStartDate && eventEndDate && String(eventStartDate).split("T")[0] !== String(eventEndDate).split("T")[0]);
  const eventLocationType = String(eventValue("event_location_type") ?? listing.event_location_type ?? "");
  const eventVenue = eventValue("event_venue") ?? listing.event_venue;
  const eventVenueAddress = eventValue("event_venue_address") ?? listing.event_venue_address;
  const eventCity = eventValue("event_city") ?? listing.event_city;
  const eventCountry = eventValue("event_country") ?? listing.event_country;
  const listingCountry = listing.type === "event" ? eventCountry : listing.country;
  const countryLabel = listing.type === "business" ? "Headquarters country" : listing.type === "community" ? "Community base country" : "Host country";
  const addressParts = listing.type === "event"
    ? [eventVenue, eventVenueAddress, eventCity]
    : [listing.address, listing.city];
  const hasPhysicalLocation = listing.type !== "event" || eventLocationType !== "online";
  const eventDateRange = formatEventDateRange({ startDate: eventStartDate ? String(eventStartDate) : null, endDate: eventEndDate ? String(eventEndDate) : null, spansMultipleDays });
  const eventTimeRange = eventBoolean("is_all_day") ? "All day" : formatEventTimeRange({ startDate: eventStartDate ? String(eventStartDate) : null, endDate: eventEndDate ? String(eventEndDate) : null, startTime: eventStartTime ? String(eventStartTime) : null, endTime: eventEndTime ? String(eventEndTime) : null, spansMultipleDays, timezoneLabel: eventTimezoneLabel ? String(eventTimezoneLabel) : null });
  const eventTicketUrl = listing.event_ticket_url || eventValue("event_ticket_url");
  const typeLabel = listing.type.charAt(0).toUpperCase() + listing.type.slice(1);
  const statTiles = [
    { label: "Views", value: listing.views_count ?? 0, icon: Eye, tint: "bg-[#F4F9E8] text-[#5F8B0A]" },
    { label: "Bookmarks", value: listing.bookmarks_count ?? 0, icon: Bookmark, tint: "bg-amber-50 text-amber-600" },
    { label: "Rating", value: Number(listing.rating ?? 0).toFixed(1), icon: Star, tint: "bg-purple-50 text-purple-600" },
    { label: "Reviews", value: listing.ratings_count ?? 0, icon: Star, tint: "bg-blue-50 text-blue-600" },
  ];
  const galleryBlock = <ListingImageGallery images={imageUrls} alt={listing.name} />;
  const description = listing.bio || listing.description || "";
  const descriptionBlock = <section className="space-y-2"><h3 className="text-sm font-semibold text-gray-900">Description</h3><div className="rounded-xl border border-gray-100 bg-gray-50 p-4">{description ? <RichTextDisplay html={description} /> : <span className="text-sm text-gray-400">No description provided.</span>}</div></section>;
  const titleBlock = <section><h2 className="text-2xl font-bold text-gray-900">{listing.name}</h2><div className="mt-2 flex flex-wrap gap-2"><span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600"><Briefcase className="h-3 w-3" />{typeLabel}</span><span className="rounded-full bg-[#E9F5D6] px-2.5 py-1 text-xs font-medium capitalize text-[#5F8B0A]">{listing.status.replaceAll("_", " ")}</span>{listing.claim_status && <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium capitalize text-gray-600">{listing.claim_status.replaceAll("_", " ")}</span>}</div></section>;
  const statsBlock = <div className="grid grid-cols-2 gap-3">{statTiles.map((tile) => <div key={tile.label} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3.5"><div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tile.tint}`}><tile.icon className="h-4 w-4" /></div><div><p className="font-bold leading-none text-gray-900">{tile.value}</p><p className="mt-1 text-xs text-gray-500">{tile.label}</p></div></div>)}</div>;
  const informationBlock = <section className="rounded-xl border border-gray-100 bg-white p-4"><h3 className="mb-1 text-sm font-semibold text-gray-900">Listing details</h3><div className="divide-y divide-gray-100"><DashboardInfoRow icon={Tag} label="Category" value={categories} /><DashboardInfoRow icon={MapPin} label={countryLabel} value={listingCountry} /><DashboardInfoRow icon={Mail} label="Email" value={listing.email} /><DashboardInfoRow icon={Phone} label="Primary phone" value={[listing.primary_country_code, listing.primary_phone].filter(Boolean).join(" ")} /><DashboardInfoRow icon={Phone} label="Secondary phone" value={[listing.secondary_country_code, listing.secondary_phone].filter(Boolean).join(" ")} /><DashboardInfoRow icon={Globe} label="Website" value={listing.website} />{listing.business_reg_num && <DashboardInfoRow icon={Briefcase} label="Business registration number" value={listing.business_reg_num} />}{listing.type === "business" && <><DashboardInfoRow icon={Briefcase} label="Operating presence" value={humanize(listing.business_presence_type)} /><DashboardInfoRow icon={Globe} label="Service reach" value={humanize(listing.business_service_reach)} /><DashboardInfoRow icon={MapPin} label="Service countries" value={listing.service_countries?.map((country) => country.name).join(", ")} /></>}{listing.type === "community" && <><DashboardInfoRow icon={MapPin} label="Location scope" value={humanize(listing.community_location_scope)} /><DashboardInfoRow icon={Briefcase} label="Participation method" value={humanize(listing.community_participation_method)} /></>}{listing.type === "event" && <><DashboardInfoRow icon={CalendarDays} label="Date" value={eventDateRange} /><DashboardInfoRow icon={Clock3} label="Time" value={eventTimeRange} /><DashboardInfoRow icon={MapPin} label="Format" value={humanize(eventLocationType)} /><DashboardInfoRow icon={Briefcase} label="Attendance" value={humanize(eventValue("attendance_type"))} /><DashboardInfoRow icon={Tag} label="Admission availability" value={humanize(eventValue("admission_availability"))} /><DashboardInfoRow icon={Tag} label="Price" value={eventValue("formatted_price") ?? [listing.event_currency, listing.event_price].filter(Boolean).join(" ")} /><DashboardInfoRow icon={Briefcase} label="Ticket provider" value={eventValue("ticket_provider")} /><DashboardInfoRow icon={Globe} label="Registration URL" value={eventValue("registration_url")} /><DashboardInfoRow icon={Globe} label="Ticket URL" value={eventTicketUrl ? "Open ticketing page" : null} href={externalHref(eventTicketUrl)} /></>}</div></section>;
  const locationBlock = <ListingLocationCard name={listing.name} addressParts={addressParts.map((part) => part ? String(part) : null)} country={listingCountry ? String(listingCountry) : null} latitude={listing.latitude} longitude={listing.longitude} physicalLocation={hasPhysicalLocation} />;
  const hoursBlock = listing.opening_hours && listing.opening_hours.length > 0 ? <section className="rounded-xl border border-gray-100 bg-white p-4"><h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-gray-900"><Clock3 className="h-4 w-4 text-[#93C01F]" />Opening hours</h3><div className="divide-y divide-gray-50">{listing.opening_hours.map((hour) => <div key={hour.day_of_week} className="flex justify-between py-2.5 text-sm"><span className="text-gray-500">{hour.day_of_week}</span><span className="font-medium text-gray-900">{hour.open_time?.slice(0, 5)} – {hour.close_time?.slice(0, 5)}</span></div>)}</div></section> : null;
  const socialBlock = socials && Object.values(socials).some(Boolean) ? <section className="rounded-xl border border-gray-100 bg-white p-4"><h3 className="mb-3 text-sm font-semibold text-gray-900">Social links</h3><div className="grid grid-cols-2 gap-2">{Object.entries(socials).map(([network, value]) => typeof value === "string" && value ? <a key={network} href={value.startsWith("http") ? value : `https://${value}`} target="_blank" rel="noreferrer" className="truncate rounded-lg bg-gray-50 px-3 py-2 text-sm capitalize text-gray-600 hover:text-[#6f9414]">{network}</a> : null)}</div></section> : null;
  return <>
    <div className="space-y-5 lg:hidden">{galleryBlock}{descriptionBlock}{titleBlock}{statsBlock}{informationBlock}{locationBlock}{socialBlock}{hoursBlock}</div>
    <div className="hidden gap-8 lg:grid lg:grid-cols-5"><div className="space-y-5 lg:col-span-3">{galleryBlock}{descriptionBlock}</div><aside className="space-y-5 lg:col-span-2">{titleBlock}{statsBlock}{informationBlock}{locationBlock}{socialBlock}{hoursBlock}</aside></div>
  </>;
}

function DashboardInfoRow({ icon: Icon, label, value, href }: { icon: typeof MapPin; label: string; value?: string | number | null; href?: string | null }) {
  if (value === undefined || value === null || value === "") return null;
  return <div className="flex gap-3 py-3"><Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#93C01F]" /><div className="min-w-0"><p className="text-xs text-gray-500">{label}</p>{href ? <a href={href} target="_blank" rel="noopener noreferrer" className="mt-0.5 inline-flex items-center gap-1.5 break-words text-sm font-semibold text-[#6f9414] hover:underline">{value}<ExternalLink className="h-3.5 w-3.5" /></a> : <p className="mt-0.5 break-words text-sm font-medium text-gray-900">{value}</p>}</div></div>;
}

function ServicesPanel({ listing }: { listing: ListingManagementData }) {
  const [services, setServices] = useState<ListingService[]>(listing.services ?? []);
  const [open, setOpen] = useState(false); const [editing, setEditing] = useState<ListingService | null>(null);
  const [name, setName] = useState(""); const [description, setDescription] = useState(""); const [image, setImage] = useState<File | null>(null); const [saving, setSaving] = useState(false);
  const token = () => localStorage.getItem("authToken") ?? undefined;
  function begin(service?: ListingService) { setEditing(service ?? null); setName(service?.name ?? ""); setDescription(service?.description ?? ""); setImage(null); setOpen(true); }
  async function save(event: FormEvent) { event.preventDefault(); setSaving(true); try { const imageKey = image ? await presignListingServiceImage(listing.slug, image, token()) : undefined; const data = { name: name.trim(), description: description.trim() || undefined, image_key: imageKey }; const saved = editing ? await updateListingService(editing.slug, data, token()) : await createListingService(listing.slug, data, token()); setServices((current) => editing ? current.map((item) => item.slug === saved.slug ? saved : item) : [...current, saved]); setOpen(false); toast.success(editing ? "Service updated" : "Service added"); } catch (saveError) { toast.error(message(saveError, "Could not save service")); } finally { setSaving(false); } }
  async function remove(service: ListingService) { if (!window.confirm(`Delete ${service.name}?`)) return; try { await deleteListingService(service.slug, token()); setServices((current) => current.filter((item) => item.slug !== service.slug)); toast.success("Service deleted"); } catch (deleteError) { toast.error(message(deleteError, "Could not delete service")); } }
  return <section className="rounded-xl border bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-semibold">Services</h2><p className="mt-1 text-sm text-slate-500">Services offered by this {listing.type}.</p></div>{listing.capabilities.can_manage_services && <Button onClick={() => begin()}><Plus className="mr-2 h-4 w-4" />Add service</Button>}</div>
    {services.length === 0 ? <div className="mt-5 rounded-xl border-2 border-dashed p-10 text-center text-slate-500"><Briefcase className="mx-auto mb-2 h-7 w-7" />No services have been added.</div> : <div className="mt-5 grid gap-3 sm:grid-cols-2">{services.map((service) => <article key={service.slug} className="flex gap-3 rounded-lg border p-3">{service.image ? <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md"><Image src={getImageUrl(service.image)} alt={service.name} fill className="object-cover" unoptimized /></div> : <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-slate-100"><Briefcase className="h-5 w-5 text-slate-400" /></div>}<div className="min-w-0 flex-1"><p className="font-medium">{service.name}</p>{service.description && <p className="mt-1 line-clamp-2 text-sm text-slate-500">{service.description}</p>}</div>{listing.capabilities.can_manage_services && <div className="flex"><Button size="icon" variant="ghost" aria-label={`Edit ${service.name}`} onClick={() => begin(service)}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" aria-label={`Delete ${service.name}`} onClick={() => void remove(service)}><Trash2 className="h-4 w-4 text-red-500" /></Button></div>}</article>)}</div>}
    <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>{editing ? "Edit service" : "Add service"}</DialogTitle></DialogHeader><form className="space-y-4" onSubmit={save}><Input required maxLength={255} value={name} onChange={(event) => setName(event.target.value)} placeholder="Service name" /><Textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Description" /><Input type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={(event) => setImage(event.target.files?.[0] ?? null)} /><Button type="submit" disabled={saving || !name.trim()}>{saving ? "Saving…" : "Save service"}</Button></form></DialogContent></Dialog>
  </section>;
}

function ReviewsPanel({ slug }: { slug: string }) {
  const [reviews, setReviews] = useState<ListingReview[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => { setLoading(true); setError(null); try { setReviews(await getListingReviews(slug)); } catch (loadError) { setError(message(loadError, "Could not load reviews")); } finally { setLoading(false); } }, [slug]);
  useEffect(() => { void load(); }, [load]);
  return <section className="rounded-xl border bg-white p-5 shadow-sm"><div><h2 className="text-lg font-semibold">Reviews</h2><p className="mt-1 text-sm text-slate-500">Read-only. Only the listing owner may respond to reviews.</p></div>{loading ? <p className="py-12 text-center text-sm text-slate-500">Loading reviews…</p> : error ? <div className="mt-5 rounded-lg bg-amber-50 p-4 text-sm text-amber-900">{error}<Button variant="link" onClick={() => void load()}>Retry</Button></div> : reviews.length === 0 ? <div className="mt-5 rounded-xl border-2 border-dashed p-10 text-center text-slate-500"><Star className="mx-auto mb-2 h-7 w-7" />No reviews yet.</div> : <div className="mt-5 space-y-4">{reviews.map((review) => { const reviewer = [review.user?.first_name, review.user?.last_name].filter(Boolean).join(" ") || "Anonymous"; return <article key={review.slug} className="rounded-xl border p-4"><div className="flex justify-between gap-3"><div><p className="font-medium">{reviewer}</p><p className="text-sm text-amber-600">{"★".repeat(Math.max(0, Math.min(5, Math.round(review.rating))))}{"☆".repeat(Math.max(0, 5 - Math.round(review.rating)))}</p></div><time className="text-xs text-slate-400">{review.created_at}</time></div>{review.comment && <p className="mt-3 text-sm leading-6 text-slate-700">{review.comment}</p>}{review.vendor_reply && <div className="mt-3 rounded-lg border-l-2 border-lime-500 bg-slate-50 p-3"><p className="text-xs font-semibold text-slate-500">Owner reply</p><p className="mt-1 text-sm text-slate-700">{review.vendor_reply}</p></div>}</article>; })}</div>}</section>;
}

function OperationsPanel({ slug, canEdit }: { slug: string; canEdit: boolean }) {
  const [sources, setSources] = useState<ListingSource[]>([]); const [notes, setNotes] = useState<ListingInternalNote[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const [sourceUrl, setSourceUrl] = useState(""); const [sourceType, setSourceType] = useState<ListingSource["source_type"]>("official_website"); const [sourcePrimary, setSourcePrimary] = useState(false); const [noteBody, setNoteBody] = useState(""); const [saving, setSaving] = useState(false);
  const token = () => localStorage.getItem("authToken") ?? undefined;
  const load = useCallback(async () => { setLoading(true); setError(null); try { const [sourceData, noteData] = await Promise.all([getListingSources(slug, token()), getListingInternalNotes(slug, token())]); setSources(sourceData); setNotes(noteData); } catch (loadError) { setError(message(loadError, "Could not load private operations")); } finally { setLoading(false); } }, [slug]);
  useEffect(() => { void load(); }, [load]);
  async function submitSource(event: FormEvent) { event.preventDefault(); setSaving(true); try { const source = await createListingSource(slug, { url: sourceUrl, source_type: sourceType, is_primary: sourcePrimary }, token()); setSources((current) => [...current, source]); setSourceUrl(""); setSourcePrimary(false); toast.success("Source added"); } catch (saveError) { toast.error(message(saveError, "Could not add source")); } finally { setSaving(false); } }
  async function submitNote(event: FormEvent) { event.preventDefault(); setSaving(true); try { const note = await createListingInternalNote(slug, noteBody, token()); setNotes((current) => [note, ...current]); setNoteBody(""); toast.success("Internal note added"); } catch (saveError) { toast.error(message(saveError, "Could not add note")); } finally { setSaving(false); } }
  if (loading) return <div className="rounded-xl border bg-white p-12 text-center text-sm text-slate-500">Loading private operations…</div>;
  if (error) return <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-900"><p>{error}</p><Button variant="link" onClick={() => void load()}>Retry</Button></div>;
  return <div className="grid gap-6 lg:grid-cols-2"><section className="rounded-xl border bg-white p-5 shadow-sm"><h2 className="text-lg font-semibold">Private sources</h2><p className="mt-1 text-sm text-slate-500">Up to five sources for administrator reference.</p>{canEdit && <form className="mt-5 space-y-3" onSubmit={submitSource}><Input type="url" required value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://official.example.org" /><select value={sourceType} onChange={(event) => setSourceType(event.target.value as ListingSource["source_type"])} className="h-10 w-full rounded-md border bg-white px-3 text-sm">{SOURCE_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={sourcePrimary} onChange={(event) => setSourcePrimary(event.target.checked)} />Primary source</label><Button disabled={saving || sources.length >= 5}><Plus className="mr-2 h-4 w-4" />Add source</Button></form>}<div className="mt-5 space-y-3">{sources.map((source) => <div key={source.id} className="flex items-center justify-between rounded-lg border p-3"><div className="min-w-0"><p className="truncate text-sm font-medium">{source.domain}</p><p className="text-xs capitalize text-slate-500">{source.source_type.replaceAll("_", " ")}{source.is_primary ? " · Primary" : ""}</p></div><a href={source.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${source.domain}`}><ExternalLink className="h-4 w-4" /></a></div>)}{sources.length === 0 && <p className="text-sm text-slate-500">No private sources recorded.</p>}</div></section>
    <section className="rounded-xl border bg-white p-5 shadow-sm"><h2 className="text-lg font-semibold">Internal notes</h2><p className="mt-1 text-sm text-slate-500">Private operational context; never shown publicly.</p>{canEdit && <form className="mt-5 space-y-3" onSubmit={submitNote}><Textarea required value={noteBody} onChange={(event) => setNoteBody(event.target.value)} placeholder="Add an internal note" /><Button disabled={saving || !noteBody.trim()}><Plus className="mr-2 h-4 w-4" />Add note</Button></form>}<div className="mt-5 space-y-3">{notes.map((note) => <div key={note.id} className="rounded-lg border p-3"><p className="whitespace-pre-wrap text-sm">{note.body}</p><p className="mt-2 text-xs text-slate-400">{note.created_at}</p></div>)}{notes.length === 0 && <p className="text-sm text-slate-500">No internal notes recorded.</p>}</div></section></div>;
}
