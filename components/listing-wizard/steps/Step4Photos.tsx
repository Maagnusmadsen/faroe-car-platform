"use client";

import { useRef, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import type { ListingWizardData, StepErrors } from "../types";
import { labelClass } from "../styles";
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_SIZE_BYTES,
  ACCEPT_STRING,
} from "@/constants/upload";

const MIN_PHOTOS = 3;

interface Step4Props {
  data: ListingWizardData;
  errors: StepErrors;
  onChange: (data: Partial<ListingWizardData>) => void;
  draftId: string | null;
}

export default function Step4Photos({ data, errors, onChange, draftId }: Step4Props) {
  const { t } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const imageIds = data.imageIds ?? [];
  const imageUrls = data.imageUrls ?? [];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (files.length === 0) return;

    const valid: File[] = [];
    for (const file of files) {
      if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_MIME_TYPES)[number])) {
        setUploadError("Invalid file type. Use JPEG, PNG or WebP.");
        continue;
      }
      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        setUploadError("File too large. Max 5MB per image.");
        continue;
      }
      valid.push(file);
    }
    if (valid.length === 0) return;

    setUploadError(null);
    if (draftId) {
      setUploading(true);
      const newUrls: string[] = [];
      const newIds: string[] = [];
      for (const file of valid) {
        const formData = new FormData();
        formData.append("file", file);
        try {
          const res = await fetch(`/api/listings/${draftId}/images`, {
            method: "POST",
            body: formData,
          });
          const json = await res.json().catch(() => ({}));
          if (res.ok && json.data?.url) {
            newUrls.push(json.data.url);
            if (json.data.id) newIds.push(json.data.id);
          } else {
            setUploadError(json.error || "Upload failed");
          }
        } catch {
          setUploadError("Upload failed");
        }
      }
      setUploading(false);
      if (newUrls.length > 0) {
        onChange({
          imageUrls: [...imageUrls, ...newUrls],
          imageIds: [...imageIds, ...newIds],
        });
      }
    } else {
      const toAdd: string[] = [];
      let done = 0;
      valid.forEach((file) => {
        const reader = new FileReader();
        reader.onload = () => {
          toAdd.push(reader.result as string);
          done++;
          if (done === valid.length) {
            onChange({ imageUrls: [...imageUrls, ...toAdd], imageIds });
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = async (index: number) => {
    const id = imageIds[index];
    if (draftId && id) {
      try {
        await fetch(`/api/listings/${draftId}/images/${id}`, { method: "DELETE" });
      } catch {
        // still remove from UI
      }
    }
    onChange({
      imageUrls: imageUrls.filter((_, i) => i !== index),
      imageIds: imageIds.filter((_, i) => i !== index),
    });
  };

  const moveImage = async (from: number, to: number) => {
    if (to < 0 || to >= imageUrls.length) return;
    const urls = [...imageUrls];
    const ids = [...imageIds];
    const [removedUrl] = urls.splice(from, 1);
    const [removedId] = ids.splice(from, 1);
    urls.splice(to, 0, removedUrl);
    ids.splice(to, 0, removedId);
    onChange({ imageUrls: urls, imageIds: ids });
    if (draftId && ids.length > 0) {
      try {
        await fetch(`/api/listings/${draftId}/images/reorder`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageIds: ids }),
        });
      } catch {
        // state already updated
      }
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-slate-900">{t("list.wizardStep4")}</h3>
      <p className="text-sm text-slate-600">
        {t("list.wizardPhotosHint")} ({MIN_PHOTOS} {t("list.wizardPhotosMin")})
      </p>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_STRING}
        multiple
        onChange={handleFileChange}
        className="hidden"
        id="wizard-photos"
        disabled={uploading}
      />
      <div
        className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-6 transition-colors hover:border-slate-300 hover:bg-slate-50"
        onClick={() => !uploading && inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && !uploading && inputRef.current?.click()}
        role="button"
        tabIndex={0}
      >
        <label htmlFor="wizard-photos" className={labelClass}>
          {t("list.uploadPhotos")}
        </label>
        <p className="text-sm text-slate-500">{t("list.uploadHint")}</p>
        {uploading && <p className="mt-2 text-sm text-slate-500">Uploading…</p>}
      </div>
      {uploadError && (
        <p className="text-sm text-red-600">{uploadError}</p>
      )}
      {imageUrls.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {imageUrls.map((url, index) => (
            <div
              key={url}
              className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
            >
              <img
                src={url}
                alt=""
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeImage(index);
                  }}
                  className="rounded-lg bg-red-500 px-3 py-1 text-sm text-white hover:bg-red-600"
                >
                  {t("list.wizardRemove")}
                </button>
                {index > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      moveImage(index, index - 1);
                    }}
                    className="rounded-lg bg-white px-3 py-1 text-sm text-slate-700"
                  >
                    ←
                  </button>
                )}
                {index < imageUrls.length - 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      moveImage(index, index + 1);
                    }}
                    className="rounded-lg bg-white px-3 py-1 text-sm text-slate-700"
                  >
                    →
                  </button>
                )}
              </div>
              {index === 0 && (
                <span className="absolute left-2 top-2 rounded bg-brand px-2 py-0.5 text-xs text-white">
                  {t("list.wizardCover")}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
      {errors.imageUrls && (
        <p className="text-sm text-red-600">{errors.imageUrls}</p>
      )}
    </div>
  );
}
