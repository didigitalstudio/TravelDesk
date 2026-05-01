"use client";

import { useActionState, useState, useTransition } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import {
  updateAgencyProfile,
  setAgencyLogoUrl,
  deleteAgencyLogo,
  type ProfileState,
} from "../actions";

const initialState: ProfileState = { status: "idle" };

export function BrandingForm({
  agencyId,
  initialName,
  initialBrandColor,
  initialLogoUrl,
}: {
  agencyId: string;
  initialName: string;
  initialBrandColor: string | null;
  initialLogoUrl: string | null;
}) {
  const [state, action, pending] = useActionState(updateAgencyProfile, initialState);
  const [logoUrl, setLogoUrl] = useState<string | null>(initialLogoUrl);
  const [color, setColor] = useState(initialBrandColor ?? "#818cf8");
  const [uploading, startUpload] = useTransition();
  const [uploadError, setUploadError] = useState<string | null>(null);

  function onPickFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setUploadError("Solo imágenes (PNG, JPG, WebP, SVG).");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setUploadError("Máximo 2 MB.");
      return;
    }
    setUploadError(null);

    startUpload(async () => {
      const supabase = createClient();
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
      const path = `agencies/${agencyId}/logo-${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("branding")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadErr) {
        setUploadError(uploadErr.message);
        return;
      }
      const { data: pub } = supabase.storage.from("branding").getPublicUrl(path);
      const res = await setAgencyLogoUrl(pub.publicUrl);
      if (!res.ok) {
        setUploadError(res.message ?? "Error al guardar el logo.");
        return;
      }
      setLogoUrl(pub.publicUrl);
    });
  }

  function onRemoveLogo() {
    if (!logoUrl) return;
    if (!confirm("¿Quitar logo actual?")) return;
    startUpload(async () => {
      // Extraer storage_path desde la public URL
      const m = /\/branding\/(.+)$/.exec(logoUrl);
      const path = m?.[1];
      if (path) {
        await deleteAgencyLogo(decodeURIComponent(path));
      } else {
        await setAgencyLogoUrl(null);
      }
      setLogoUrl(null);
    });
  }

  return (
    <section className="surface p-6">
      <header className="mb-4">
        <h2 className="text-base font-semibold text-zinc-100">Identidad de la agencia</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Estos datos se usan en el PDF de presupuesto y en el resumen al cliente.
        </p>
      </header>

      <div className="mb-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.03]">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt="Logo de la agencia"
              width={80}
              height={80}
              className="h-full w-full object-contain"
              unoptimized
            />
          ) : (
            <span className="text-[10px] uppercase tracking-wider text-zinc-500">
              Sin logo
            </span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <label className="btn-ghost inline-flex w-fit cursor-pointer items-center justify-center">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onPickFile(file);
                e.target.value = "";
              }}
            />
            {uploading ? "Subiendo…" : logoUrl ? "Cambiar logo" : "Subir logo"}
          </label>
          {logoUrl && (
            <button
              type="button"
              onClick={onRemoveLogo}
              disabled={uploading}
              className="text-xs text-rose-300 hover:text-rose-200 disabled:opacity-50"
            >
              Quitar logo
            </button>
          )}
          <p className="text-[11px] text-zinc-500">PNG / JPG / WebP / SVG · máx 2 MB</p>
          {uploadError && (
            <p className="text-xs text-rose-300">{uploadError}</p>
          )}
        </div>
      </div>

      <form action={action} className="space-y-4">
        <Field label="Nombre" htmlFor="agency-name">
          <input
            id="agency-name"
            name="name"
            defaultValue={initialName}
            className="input-base"
            required
            minLength={2}
            maxLength={120}
          />
        </Field>
        <Field label="Color de marca" htmlFor="agency-color">
          <div className="flex items-center gap-3">
            <input
              id="agency-color"
              type="color"
              name="brand_color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-10 w-14 cursor-pointer rounded-lg border border-white/[0.08] bg-transparent"
            />
            <input
              type="text"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              pattern="^#[0-9A-Fa-f]{6}$"
              className="input-base max-w-[10rem] font-mono text-xs"
            />
            <span
              aria-hidden
              className="h-10 flex-1 rounded-lg"
              style={{
                background: `linear-gradient(90deg, ${color}33, ${color})`,
              }}
            />
          </div>
        </Field>
        <div className="flex items-center gap-3">
          <button type="submit" className="btn-primary" disabled={pending}>
            {pending ? "Guardando…" : "Guardar cambios"}
          </button>
          {state.status === "ok" && (
            <span className="text-xs text-emerald-300">{state.message}</span>
          )}
          {state.status === "error" && (
            <span className="text-xs text-rose-300">{state.message}</span>
          )}
        </div>
      </form>
    </section>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-zinc-500">
        {label}
      </label>
      {children}
    </div>
  );
}
