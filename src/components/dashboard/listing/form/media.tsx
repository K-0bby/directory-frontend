/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { ListingFormHandle } from "@/components/dashboard/listing/types";
import { useListing } from "@/context/listing-form-context";
import { FileUploader } from "@/components/dashboard/listing/media-uploader";
import { z } from "zod";
import { handleSessionExpired } from "@/lib/session";
import {
  MediaSaveProgress,
  MediaSlotInput,
  saveListingMediaAtomic,
} from "@/lib/media-revision";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProgressRing } from "@/components/ui/progress-ring";

interface Props {
  listingType: "business" | "event" | "community";
  listingSlug: string;
}

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const MAX_VIDEO_SIZE_BYTES = 20 * 1024 * 1024;
const MAX_VIDEO_DURATION_SECONDS = 30;
const MAX_GALLERY_IMAGES = 3;

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/webp", "image/png"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/quicktime"];

const gallerySchema = z
  .array(z.any())
  .max(MAX_GALLERY_IMAGES, {
    message: `You can only upload a maximum of ${MAX_GALLERY_IMAGES} gallery items.`,
  })
  .refine(
    (files) =>
      files.every((file) =>
        !file.size || file.size <= (file.type?.startsWith("video/") ? MAX_VIDEO_SIZE_BYTES : MAX_FILE_SIZE_BYTES),
      ),
    { message: "Images must be 5MB or less and videos 20MB or less." },
  )
  .refine(
    (files) =>
      files.every(
        (file) =>
          !(file instanceof File) || [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES].includes(file.type),
      ),
    { message: "Gallery media must be JPEG, WebP, PNG, MP4, or MOV." },
  )
  .refine(
    (files) => files.filter((file) =>
      file instanceof File ? file.type.startsWith("video/") : file?.kind === "video",
    ).length <= 1,
    { message: "Only one gallery video is allowed." },
  );

// Dimension policy (mirrors config/listing-media.php):
// - HARD floor 200×200 — blocks only icon/thumbnail-sized files that would
//   render visibly broken. Rejected at selection with a clear message.
// - SOFT quality mark 600px — smaller images are accepted with a non-blocking
//   "may look blurry" nudge so the vendor stays in control.
const HARD_MIN = { width: 200, height: 200 };
const QUALITY_MARK = { width: 600, height: 600 };

const readImageDimensions = (
  file: File,
): Promise<{ width: number; height: number }> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`"${file.name}" could not be read as an image.`));
    };
    img.src = url;
  });

/** Blocking error for absurdly small files, soft warning for smallish ones. */
const checkImageDimensions = async (
  file: File,
): Promise<{ error?: string; warning?: string }> => {
  if (!file.type.startsWith("image/")) return {};
  try {
    const { width, height } = await readImageDimensions(file);
    if (width < HARD_MIN.width || height < HARD_MIN.height) {
      return {
        error: `"${file.name}" is only ${width}×${height}px — images need to be at least ${HARD_MIN.width}×${HARD_MIN.height}px.`,
      };
    }
    if (width < QUALITY_MARK.width || height < QUALITY_MARK.height) {
      return {
        warning: `"${file.name}" is ${width}×${height}px and may look blurry on your listing — a larger photo will look sharper.`,
      };
    }
    return {};
  } catch {
    return { error: `"${file.name}" could not be read as an image.` };
  }
};

/**
 * Persistent quality nudge — the project-standard amber notice (matches the
 * claims UI and this form's capacity hints) instead of a transient toast.
 */
const QualityNotice = ({ messages }: { messages: string[] }) => {
  if (messages.length === 0) return null;
  return (
    <div
      className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800"
      role="status"
      aria-live="polite"
    >
      <TriangleAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
      <div className="space-y-1">
        {messages.map((message, index) => (
          <p key={index} className="leading-relaxed">
            {message}
          </p>
        ))}
      </div>
    </div>
  );
};

const readVideoDuration = (file: File): Promise<number> =>
  new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const duration = video.duration;
      URL.revokeObjectURL(url);
      resolve(duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`"${file.name}" is not a playable video.`));
    };
    video.src = url;
  });

const coverSchema = z
  .any()
  .refine((file) => !file || !file.size || file.size <= MAX_FILE_SIZE_BYTES, {
    message: `Cover photo must be less than ${MAX_FILE_SIZE_MB}MB.`,
  })
  .refine(
    (file) =>
      !file || !(file instanceof File) || ALLOWED_IMAGE_TYPES.includes(file.type),
    { message: "Cover photo must be a JPEG, WebP, or PNG image." },
  );

const shouldCompressImage = (file: File): boolean => {
  if (!file || !(file instanceof File) || !file.type.startsWith("image/"))
    return false;
  return file.size > MAX_FILE_SIZE_BYTES;
};

const smartCompressImage = async (file: File): Promise<File> => {
  if (!shouldCompressImage(file)) return file;
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_SIZE = 1920;
        let width = img.width;
        let height = img.height;
        if (width > MAX_SIZE || height > MAX_SIZE) {
          if (width > height) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          } else {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(
                new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
                  type: "image/jpeg",
                  lastModified: Date.now(),
                }),
              );
            } else {
              resolve(file);
            }
          },
          "image/jpeg",
          0.85,
        );
      };
      img.onerror = () => resolve(file);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
};

const getExistingId = (item: any): number | null => {
  if (!item || item instanceof File) return null;
  const id = Number(item.id);
  return Number.isFinite(id) && id > 0 ? id : null;
};

/**
 * Fixed id shared by every stage of a media save (uploading → processing →
 * result). Sonner replaces the content of an existing toast when it sees an
 * id it already knows, so reusing one constant guarantees a single toast no
 * matter how many progress events arrive — the previous implementation let
 * each event mint a new toast, which stacked dozens of them.
 */
const MEDIA_SAVE_TOAST_ID = "listing-media-save";

/** Compact one-line progress body rendered inside the single save toast. */
const MediaSaveToast = ({
  progress,
  onCancel,
}: {
  progress: MediaSaveProgress | null;
  onCancel: () => void;
}) => {
  const processing = progress?.phase === "processing";
  return (
    <div className="flex w-full items-center gap-3">
      <ProgressRing value={progress?.overallPercent ?? 0} size={36} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900">
          {processing ? "Processing media…" : "Uploading media…"}
        </p>
        <p className="text-xs text-gray-500">
          {processing
            ? "Finishing up — almost done."
            : progress
              ? `File ${progress.fileIndex} of ${progress.totalFiles}`
              : "Preparing files…"}
        </p>
      </div>
      {!processing && (
        <button
          type="button"
          onClick={onCancel}
          className="shrink-0 rounded-md px-2 py-2 text-xs font-medium text-gray-500 hover:text-gray-900"
        >
          Cancel
        </button>
      )}
    </div>
  );
};

export const MediaUploadStep = forwardRef<ListingFormHandle, Props>(
  ({ listingSlug }, ref) => {
    const { media, setMedia } = useListing();
    const [isUploading, setIsUploading] = useState(false);
    const activeSave = useRef<AbortController | null>(null);
    // Last percent actually pushed to the toast. XHR upload events fire far
    // more often than the UI can meaningfully change, so updates are skipped
    // until the whole-number percent moves.
    const lastRenderedPercent = useRef(-1);
    const [altTexts, setAltTexts] = useState<Record<string, string>>({});
    const [failedFiles, setFailedFiles] = useState<File[]>([]);
    // Persistent quality nudges for smallish (but accepted) images, keyed by
    // mediaKey — shown inline under the relevant uploader so they stay visible
    // for as long as the file is selected, unlike a transient toast.
    const [qualityNotes, setQualityNotes] = useState<Record<string, string>>({});
    const persistedCoverId = useRef<number | null>(getExistingId(media.coverPhoto));

    const mediaKey = (item: any): string => {
      if (item instanceof File) return `file:${item.name}:${item.size}:${item.lastModified}`;
      return `media:${item?.id ?? item?.original ?? "unknown"}`;
    };

    const accessibilityText = (item: any): string =>
      altTexts[mediaKey(item)] ?? (item instanceof File ? "" : item?.alt_text ?? "");

    const updateAccessibilityText = (item: any, value: string) => {
      setAltTexts((current) => ({ ...current, [mediaKey(item)]: value }));
    };

    const validateMediaState = () => {
      const galleryResult = gallerySchema.safeParse(media.images);
      const coverResult = coverSchema.safeParse(media.coverPhoto);
      if (!galleryResult.success) {
        toast.error(galleryResult.error.issues[0].message);
        return false;
      }
      if (!coverResult.success) {
        toast.error(coverResult.error.issues[0].message);
        return false;
      }
      // Gallery without a cover is not a valid state — the backend commit
      // requires an explicit cover (media PRD §6.2).
      if (!media.coverPhoto && media.images.length > 0) {
        toast.error("Please add a cover photo before adding gallery images.");
        return false;
      }
      return true;
    };

    /**
     * One atomic save: every change (add, replace, remove, reorder) is expressed
     * as a single desired state and committed in one operation — the previous
     * collection stays live if anything fails (media PRD §11).
     */
    const saveMedia = async () => {
      // A draft may be left without media entirely.
      if (!media.coverPhoto && media.images.length === 0) return true;

      // React state does not update synchronously, so a rapid second submit can
      // otherwise create a new revision while the first upload is in flight.
      // Creating that second revision cancels the first on the backend and makes
      // its staged item upload target disappear from the active flow.
      if (activeSave.current) {
        toast.info("Your media is already being saved.");
        return false;
      }

      try {
        const controller = new AbortController();
        activeSave.current = controller;
        setIsUploading(true);
        lastRenderedPercent.current = -1;
        const token = localStorage.getItem("authToken") || undefined;

        const showSaveToast = (progress: MediaSaveProgress | null) =>
          toast(
            <MediaSaveToast
              progress={progress}
              onCancel={() => controller.abort()}
            />,
            { id: MEDIA_SAVE_TOAST_ID, duration: Infinity },
          );

        // Shown before the first byte moves so there is never a dead gap
        // between tapping save and the first progress event.
        showSaveToast(null);

        for (const item of media.images) {
          if (item instanceof File && item.type.startsWith("video/")) {
            const duration = await readVideoDuration(item);
            if (duration > MAX_VIDEO_DURATION_SECONDS) {
              throw new Error(`"${item.name}" is longer than the 30 second limit.`);
            }
          }
        }

        const toSlot = async (item: any): Promise<MediaSlotInput> => {
          if (item instanceof File) return smartCompressImage(item);
          return { id: getExistingId(item) as number };
        };

        const cover = await toSlot(media.coverPhoto);
        const gallery = await Promise.all(media.images.map(toSlot));

        const result = await saveListingMediaAtomic({
          listingSlug,
          cover,
          fallbackCover: persistedCoverId.current ? { id: persistedCoverId.current } : undefined,
          gallery,
          coverAltText: accessibilityText(media.coverPhoto),
          galleryAltTexts: media.images.map(accessibilityText),
          token,
          onProgress: (progress) => {
            // Repaint only when the visible number changes; the processing
            // phase always repaints since its label differs at the same 100%.
            if (
              progress.phase === "uploading" &&
              progress.overallPercent === lastRenderedPercent.current
            ) {
              return;
            }
            lastRenderedPercent.current = progress.overallPercent;
            showSaveToast(progress);
          },
          signal: controller.signal,
        });

        // Sync context with the committed canonical state so step navigation
        // shows server objects, not stale Files.
        persistedCoverId.current = result.media.cover?.id ?? null;
        const failedGalleryFiles = result.failures
          .map((failure) => failure.file)
          .filter((file) => media.images.includes(file));
        setFailedFiles(result.failures.map((failure) => failure.file));
        // Saved files become server objects, so their quality-note keys are
        // stale; failed files get explicit error markers instead.
        setQualityNotes({});
        setMedia({
          coverPhoto: result.media.cover ?? null,
          images: [...result.media.gallery, ...failedGalleryFiles],
        });

        // Every terminal state reuses MEDIA_SAVE_TOAST_ID so the progress
        // toast morphs into its own result rather than leaving one behind and
        // opening a second. `duration` is reset because the progress toast was
        // created with Infinity, which would otherwise stick permanently.
        if (result.failures.length > 0) {
          // One summary, not one per file — the failed files are already
          // marked inline (setFailedFiles), which is where per-file detail
          // belongs.
          const failedCount = result.failures.length;
          toast.warning(
            `${failedCount} ${failedCount === 1 ? "file" : "files"} could not be saved`,
            {
              id: MEDIA_SAVE_TOAST_ID,
              duration: 6000,
              description:
                "Everything else was saved. The files that failed are marked below — retry just those.",
            },
          );
        } else {
          toast.success("Media saved!", {
            id: MEDIA_SAVE_TOAST_ID,
            duration: 4000,
          });
        }
        return true;
      } catch (error: any) {
        if (error?.name === "AbortError") {
          toast.info("Media save cancelled. Your current public media was not changed.", {
            id: MEDIA_SAVE_TOAST_ID,
            duration: 4000,
          });
          return false;
        }
        if (typeof error?.status === "number" && handleSessionExpired(error.status)) {
          toast.dismiss(MEDIA_SAVE_TOAST_ID);
          return false;
        }
        toast.error(error.message || "Media save failed", {
          id: MEDIA_SAVE_TOAST_ID,
          duration: 6000,
        });
        return false;
      } finally {
        activeSave.current = null;
        setIsUploading(false);
        // Deliberately no blanket toast.dismiss(): with no id it dismisses
        // *every* toast, which previously wiped the result message this
        // function had just shown.
      }
    };

    useImperativeHandle(ref, () => ({
      async submit() {
        if (!validateMediaState()) return false;
        return saveMedia();
      },
    }));

    return (
      <div className="py-4 space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-1">Media Upload</h2>
          <p className="text-sm text-muted-foreground">
            The cover must be an image. Gallery media supports images up to 5MB
            and one MP4 or MOV video up to 20MB and 30 seconds.
          </p>
        </div>

        <div className="space-y-8">
          <div>
            <h3 className="font-medium text-gray-900 mb-2">
              Cover Photo{" "}
              <span className="text-gray-400 font-normal text-sm">
                (required before publishing)
              </span>
            </h3>
            <FileUploader
              label=""
              multiple={false}
              files={media.coverPhoto ? [media.coverPhoto] : []}
              onChange={async (files) => {
                const newItem = files[0] || null;
                if (newItem instanceof File) {
                  const result = coverSchema.safeParse(newItem);
                  if (!result.success) {
                    toast.error(result.error.issues[0].message);
                    return;
                  }
                  const { error, warning } = await checkImageDimensions(newItem);
                  if (error) {
                    toast.error(error);
                    return;
                  }
                  setQualityNotes((notes) => {
                    const next = { ...notes };
                    if (media.coverPhoto) delete next[mediaKey(media.coverPhoto)];
                    if (warning) next[mediaKey(newItem)] = warning;
                    return next;
                  });
                } else if (media.coverPhoto) {
                  const previousKey = mediaKey(media.coverPhoto);
                  setQualityNotes((notes) =>
                    Object.fromEntries(
                      Object.entries(notes).filter(([key]) => key !== previousKey),
                    ),
                  );
                }
                setMedia({ ...media, coverPhoto: newItem });
              }}
              accept="image/jpeg,image/jpg,image/webp,image/png"
              maxSize={MAX_FILE_SIZE_BYTES}
              allowPersistedRemoval={false}
            />
            <QualityNotice
              messages={
                media.coverPhoto && qualityNotes[mediaKey(media.coverPhoto)]
                  ? [qualityNotes[mediaKey(media.coverPhoto)]]
                  : []
              }
            />
            {media.coverPhoto && (
              <div className="mt-3 space-y-1.5">
                <Label htmlFor="cover-alt-text">Cover image description (optional)</Label>
                <Input
                  id="cover-alt-text"
                  value={accessibilityText(media.coverPhoto)}
                  maxLength={500}
                  placeholder="Defaults to the listing name"
                  onChange={(event) => updateAccessibilityText(media.coverPhoto, event.target.value)}
                />
              </div>
            )}
          </div>

          <div>
            <h3 className="font-medium text-gray-900 mb-2">
              Gallery Media{" "}
              <span className="text-gray-400 font-normal text-sm">
                (optional, up to {MAX_GALLERY_IMAGES})
              </span>
            </h3>
            <FileUploader
              label=""
              files={media.images}
              onChange={async (files) => {
                setFailedFiles((current) => current.filter((file) => files.includes(file)));
                const result = gallerySchema.safeParse(files);
                if (!result.success) {
                  toast.error(result.error.issues[0].message);
                  if (files.length > MAX_GALLERY_IMAGES) {
                    setMedia({
                      ...media,
                      images: files.slice(0, MAX_GALLERY_IMAGES),
                    });
                  }
                  return;
                }

                // Hard-reject only icon-sized files; smallish images are accepted
                // with a persistent, non-blocking quality nudge below the uploader
                // (product decision 2026-07-19).
                const accepted: typeof files = [];
                const galleryNotes: Record<string, string> = {};
                for (const item of files) {
                  if (!(item instanceof File)) {
                    accepted.push(item);
                    continue;
                  }
                  const { error, warning } = await checkImageDimensions(item);
                  if (error) {
                    toast.error(error);
                    continue;
                  }
                  if (warning) galleryNotes[mediaKey(item)] = warning;
                  accepted.push(item);
                }
                setQualityNotes((notes) => {
                  // Rebuild gallery-file notes from this selection; keep the cover's.
                  const next: Record<string, string> = { ...galleryNotes };
                  if (media.coverPhoto && notes[mediaKey(media.coverPhoto)]) {
                    next[mediaKey(media.coverPhoto)] = notes[mediaKey(media.coverPhoto)];
                  }
                  return next;
                });
                setMedia({ ...media, images: accepted });
              }}
              multiple={true}
              maxFiles={3}
              accept="image/jpeg,image/jpg,image/webp,image/png,video/mp4,video/quicktime"
              sortable
              confirmPersistedRemoval
              failedFiles={failedFiles}
            />
            <QualityNotice
              messages={media.images
                .map((item) => qualityNotes[mediaKey(item)])
                .filter((message): message is string => Boolean(message))}
            />
            {media.images.length >= MAX_GALLERY_IMAGES && (
              <p className="mt-2 text-sm text-amber-700" role="status">
                Gallery full. Mark an existing item for removal before adding another.
              </p>
            )}
            {media.images.length > 0 && (
              <div className="mt-4 space-y-3">
                {media.images.map((item: any, index: number) => {
                  const video = item instanceof File
                    ? item.type.startsWith("video/")
                    : item?.kind === "video" || item?.mime_type?.startsWith("video/");
                  return (
                    <div key={mediaKey(item)} className="space-y-1.5">
                      <Label htmlFor={`gallery-alt-${index}`}>
                        {video ? "Video title" : `Gallery image ${index + 1} description`} (optional)
                      </Label>
                      <Input
                        id={`gallery-alt-${index}`}
                        value={accessibilityText(item)}
                        maxLength={500}
                        placeholder={video ? "Describe the video" : "Describe what is shown"}
                        onChange={(event) => updateAccessibilityText(item, event.target.value)}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700">Total Files:</span>
              <span
                className={
                  isUploading ? "animate-pulse text-blue-600" : "text-gray-600"
                }
              >
                {[media.coverPhoto, ...media.images].filter(Boolean).length}/4
                {isUploading ? " Saving…" : " Ready"}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  },
);

MediaUploadStep.displayName = "MediaUploadStep";
