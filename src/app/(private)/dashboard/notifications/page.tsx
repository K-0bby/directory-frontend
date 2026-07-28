"use client";

import { useEffect, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface NotificationItem { id: string; title: string; message: string; link: string | null; read_at: string | null; created_at: string; }

export default function NotificationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const token = () => localStorage.getItem("authToken");

  useEffect(() => {
    fetch("/api/notifications", { headers: { Accept: "application/json", Authorization: `Bearer ${token()}` }, cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => setItems(Array.isArray(payload.data) ? payload.data : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);
  const open = async (item: NotificationItem) => {
    await fetch(`/api/notifications/${item.id}/read`, { method: "PATCH", headers: { Accept: "application/json", Authorization: `Bearer ${token()}` } });
    setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, read_at: new Date().toISOString() } : entry));
    if (item.link) router.push(item.link);
  };
  const markAll = async () => {
    await fetch("/api/notifications/mark-all-read", { method: "POST", headers: { Accept: "application/json", Authorization: `Bearer ${token()}` } });
    setItems((current) => current.map((item) => ({ ...item, read_at: item.read_at ?? new Date().toISOString() })));
  };

  return <main className="mx-auto max-w-4xl space-y-6 p-4 lg:p-8">
    <div className="flex items-center justify-between gap-4"><div><h1 className="text-2xl font-semibold">Notifications</h1><p className="text-sm text-muted-foreground">Listing submissions and moderation updates.</p></div><Button variant="outline" onClick={markAll}><CheckCheck className="mr-2 h-4 w-4" />Mark all read</Button></div>
    <div className="overflow-hidden rounded-xl border bg-white">
      {loading ? <p className="p-8 text-sm text-muted-foreground">Loading notifications…</p> : items.length === 0 ? <p className="p-8 text-sm text-muted-foreground">You have no notifications.</p> : items.map((item) => <button key={item.id} onClick={() => open(item)} className={`flex w-full items-start gap-3 border-b p-4 text-left last:border-0 ${item.read_at ? "bg-white" : "bg-blue-50/60"}`}><span className="rounded-lg bg-slate-900 p-2"><Bell className="h-4 w-4 text-[#93C01F]" /></span><span className="min-w-0 flex-1"><span className="block font-medium">{item.title}</span><span className="mt-1 block text-sm text-muted-foreground">{item.message}</span><span className="mt-2 block text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString()}</span></span>{!item.read_at && <span className="mt-2 h-2 w-2 rounded-full bg-blue-600" />}</button>)}
    </div>
  </main>;
}
