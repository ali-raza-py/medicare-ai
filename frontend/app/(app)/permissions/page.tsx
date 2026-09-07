"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { Building2, Loader2, ShieldCheck, Trash2 } from "lucide-react";
import {
  fetchHospitalAccess,
  grantHospitalAccess,
  revokeHospitalAccess,
  type HospitalAccessEntry,
} from "@/lib/api";
import { useSession } from "@/lib/session";

export default function PermissionsPage() {
  const { user } = useSession();
  const [entries, setEntries] = useState<HospitalAccessEntry[]>([]);
  const [hospitalEmail, setHospitalEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setEntries(await fetchHospitalAccess());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load hospital access.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user?.role !== "patient") return;
    const initialFetch = setTimeout(() => void load(), 0);
    return () => clearTimeout(initialFetch);
  }, [user?.role]);

  async function handleGrant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hospitalEmail.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const entry = await grantHospitalAccess(hospitalEmail.trim());
      setEntries((current) => {
        const withoutEntry = current.filter((item) => item.hospital_email !== entry.hospital_email);
        return [...withoutEntry, entry];
      });
      setHospitalEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to grant hospital access.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRevoke(email: string) {
    setError(null);
    try {
      const entry = await revokeHospitalAccess(email);
      setEntries((current) => current.map((item) => item.hospital_email === email ? entry : item));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke hospital access.");
    }
  }

  if (user?.role !== "patient") {
    return (
      <section className="mx-auto max-w-3xl rounded-3xl border border-amber-200 bg-amber-50 p-6 text-center">
        <h2 className="text-base font-bold text-amber-900">Hospital accounts use the Hospital Portal</h2>
        <p className="mt-2 text-sm text-amber-800">Patient permission controls are not available for hospital accounts.</p>
        <Link href="/hospital" className="mt-4 inline-flex rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-teal-700">Open Hospital Portal</Link>
      </section>
    );
  }

  return (
    <div className="animate-page-enter mx-auto w-full max-w-4xl space-y-6">
      <section className="rounded-3xl border border-[#bfe9dc] bg-white p-6 shadow-[0_10px_26px_rgba(31,65,55,0.06)]">
        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#dff7ef] text-[#0b9b8e]"><ShieldCheck className="h-5 w-5" /></span>
          <div><h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Hospital Access</h2><p className="mt-1 text-sm text-slate-600">Control which hospitals can view your medical records.</p></div>
        </div>
        <form onSubmit={handleGrant} className="mt-6 flex flex-col gap-3 sm:flex-row">
          <input value={hospitalEmail} onChange={(event) => setHospitalEmail(event.target.value)} type="email" required placeholder="hospital@example.com" aria-label="Hospital email" className="min-h-11 flex-1 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#0b9b8e] focus:ring-2 focus:ring-[#0b9b8e]/15" />
          <button type="submit" disabled={saving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#0b9b8e] px-4 text-sm font-bold text-white hover:bg-[#087c72] disabled:opacity-60">{saving && <Loader2 className="h-4 w-4 animate-spin" />}Grant Access</button>
        </form>
      </section>

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_10px_26px_rgba(31,65,55,0.06)]">
        <h3 className="text-base font-extrabold text-slate-900">Authorized Hospitals</h3>
        {loading ? <p className="mt-4 text-sm text-slate-500">Loading access...</p> : entries.length === 0 ? <p className="mt-4 text-sm text-slate-500">No hospitals have access to your records.</p> : <div className="mt-4 space-y-3">{entries.map((entry) => <div key={entry.hospital_email} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-4"><Building2 className="h-5 w-5 text-[#0b9b8e]" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-900">{entry.hospital_email}</p><p className="mt-1 text-xs text-slate-500">Status: {entry.status}</p></div>{entry.status === "ACTIVE" && <button type="button" onClick={() => void handleRevoke(entry.hospital_email)} className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" />Revoke</button>}</div>)}</div>}
      </section>
    </div>
  );
}