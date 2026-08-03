// Shared atomic media save — the one canonical workflow both the main create/edit
// wizard and the manual-listing flow use (listing-media PRD §11). One call stages
// every new file, waits for server-side normalization, then commits the complete
// desired state in a single atomic operation. The previous active collection
// stays live until the commit succeeds.

import {
  ApiRateLimitError,
  ApiRequestError,
  ListingActiveMedia,
  MediaRef,
  cancelMediaRevision,
  createMediaRevision,
  commitMediaRevision,
  getMediaRevision,
  stageRevisionItem,
  updateRevisionDesiredState,
  uploadRevisionItemFile,
} from "@/lib/api";

export type MediaSlotInput = File | { id: number };

export interface MediaFileFailure {
  file: File;
  message: string;
}

export interface MediaSaveResult {
  media: ListingActiveMedia;
  failures: MediaFileFailure[];
}

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_INTERVAL_MS = 5000;
const POLL_TIMEOUT_MS = 180_000;

const FAILURE_MESSAGES: Record<string, string> = {
  below_minimum_dimensions:
    "is too small — images need to be at least 200×200px.",
  unsupported_or_disguised_format: "is not a supported image format.",
  file_too_large: "exceeds the 5MB limit.",
  staging_file_missing: "did not finish uploading. Please try again.",
  image_processing_failed: "could not be processed. Please try a different file.",
  invalid_video: "is not a valid playable video.",
  video_too_long: "is longer than the 30 second limit.",
  video_processing_failed: "could not be converted. Please try a different video.",
  poster_generation_failed: "could not generate a preview image.",
};

function isFile(input: MediaSlotInput): input is File {
  return typeof File !== "undefined" && input instanceof File;
}

function wait(milliseconds: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timeout);
      reject(new DOMException('Media save cancelled.', 'AbortError'));
    };
    const timeout = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, milliseconds);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

export interface MediaSaveOptions {
  listingSlug: string;
  cover: MediaSlotInput;
  fallbackCover?: { id: number };
  gallery: MediaSlotInput[];
  coverAltText?: string;
  galleryAltTexts?: string[];
  token?: string;
  /**
   * Reports progress across the whole batch. `overallPercent` is computed
   * here rather than by the caller because this is the only place that knows
   * the full upload list — deriving it caller-side from per-file percentages
   * would mean keying on filenames, which collide in practice (two phones
   * both produce `IMG_0001.jpeg`).
   */
  onProgress?: (progress: MediaSaveProgress) => void;
  signal?: AbortSignal;
}

/**
 * `uploading` covers pushing bytes to storage; `processing` is the
 * server-side normalization that follows, which has no byte-level progress
 * to report but can take a noticeable amount of time.
 */
export type MediaSavePhase = "uploading" | "processing";

export interface MediaSaveProgress {
  phase: MediaSavePhase;
  /** 1-based index of the file currently uploading. */
  fileIndex: number;
  totalFiles: number;
  /** Progress of the current file, 0-100. */
  filePercent: number;
  /** Progress across the entire batch, 0-100. */
  overallPercent: number;
}

/**
 * Atomically saves a listing's complete media state.
 *
 * `cover` is required; `gallery` is the desired final gallery in display order.
 * Existing server media is passed as `{id}`; new selections as `File`. Anything
 * currently active but absent from the desired state is removed by the commit.
 *
 * Self-healing: a save that dies mid-flight because its revision was invalidated
 * (another tab/session superseded it, it expired, the listing's media moved on —
 * 404/409 responses) is transparently restarted once on a fresh revision before
 * any error reaches the user.
 */
export async function saveListingMediaAtomic(options: MediaSaveOptions): Promise<MediaSaveResult> {
  try {
    return await attemptListingMediaSave(options);
  } catch (error) {
    const isRevisionLifecycleError =
      error instanceof ApiRequestError && (error.status === 404 || error.status === 409);
    if (!isRevisionLifecycleError) throw error;
    options.signal?.throwIfAborted();
    return attemptListingMediaSave(options);
  }
}

async function attemptListingMediaSave(options: MediaSaveOptions): Promise<MediaSaveResult> {
  const { listingSlug, cover, fallbackCover, gallery, coverAltText, galleryAltTexts, token, onProgress, signal } = options;

  const revision = await createMediaRevision(listingSlug, token);

  try {
    signal?.throwIfAborted();
    // Stage + upload every new file, remembering which staged item fills which slot.
    const stagedIds = new Map<File, number>();
    const failures: MediaFileFailure[] = [];
    const uploads: Array<{ file: File; role: "cover" | "gallery" }> = [];
    if (isFile(cover)) uploads.push({ file: cover, role: "cover" });
    gallery.forEach((slot) => {
      if (isFile(slot)) uploads.push({ file: slot, role: "gallery" });
    });

    for (const [index, { file, role }] of uploads.entries()) {
      try {
        const stage = await stageRevisionItem(
          revision.id,
          {
            role,
            kind: file.type.startsWith("video/") ? "video" : "image",
            original_filename: file.name,
            mime_type: file.type,
            file_size: file.size,
          },
          token,
        );
        await uploadRevisionItemFile(revision.id, stage, file, token, (pct) => {
          onProgress?.({
            phase: "uploading",
            fileIndex: index + 1,
            totalFiles: uploads.length,
            filePercent: pct,
            // Each file is treated as an equal share of the batch. Weighting
            // by byte size would be more precise, but the compressed sizes
            // aren't known until each upload starts.
            overallPercent: Math.round((index * 100 + pct) / uploads.length / 100 * 100),
          });
        }, signal);
        stagedIds.set(file, stage.item_id);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") throw error;
        if (error instanceof ApiRequestError && (error.status === 404 || error.status === 409)) {
          throw error;
        }
        failures.push({
          file,
          message: error instanceof Error ? error.message : "failed to upload.",
        });
      }
    }

    // Wait for server-side normalization of every staged item.
    if (uploads.length > 0) {
      onProgress?.({
        phase: "processing",
        fileIndex: uploads.length,
        totalFiles: uploads.length,
        filePercent: 100,
        overallPercent: 100,
      });
      const deadline = Date.now() + POLL_TIMEOUT_MS;
      let pollInterval = POLL_INTERVAL_MS;
      for (;;) {
        signal?.throwIfAborted();
        let state;
        try {
          state = await getMediaRevision(revision.id, token);
        } catch (error) {
          if (error instanceof ApiRateLimitError) {
            await wait(error.retryAfterSeconds * 1000, signal);
            continue;
          }
          throw error;
        }
        const staged = state.items.filter((i) =>
          Array.from(stagedIds.values()).includes(i.id),
        );

        const terminal = staged.every((i) => i.status === "ready" || i.status === "failed");
        if (terminal) {
          for (const item of staged.filter((candidate) => candidate.status === "failed")) {
            const file = Array.from(stagedIds.entries()).find(([, id]) => id === item.id)?.[0];
            if (!file) continue;
            stagedIds.delete(file);
            const reason = FAILURE_MESSAGES[item.failure_code ?? ""] ?? "failed to process.";
            failures.push({ file, message: reason });
          }
          break;
        }

        if (Date.now() > deadline) {
          throw new Error(
            "Media processing is taking longer than expected. Please try again in a moment.",
          );
        }
        await wait(pollInterval, signal);
        pollInterval = Math.min(MAX_POLL_INTERVAL_MS, Math.ceil(pollInterval * 1.25));
      }
    }

    const toRef = (slot: MediaSlotInput): MediaRef =>
      isFile(slot)
        ? { type: "item", id: stagedIds.get(slot) as number }
        : { type: "media", id: slot.id };

    const resolvedCover = isFile(cover) && !stagedIds.has(cover) ? fallbackCover : cover;
    if (!resolvedCover) {
      const coverFailure = failures.find((failure) => failure.file === cover);
      throw new Error(coverFailure ? `"${coverFailure.file.name}" ${coverFailure.message}` : "A valid cover image is required.");
    }
    const successfulGallery = gallery.filter((slot) => !isFile(slot) || stagedIds.has(slot));

    await updateRevisionDesiredState(
      revision.id,
      {
        cover: toRef(resolvedCover),
        gallery: successfulGallery.map(toRef),
        alt_texts: {
          cover: coverAltText?.trim() ?? "",
          ...Object.fromEntries(
            successfulGallery.map((_, index) => [
              `gallery_${index + 1}`,
              galleryAltTexts?.[index]?.trim() ?? "",
            ]),
          ),
        },
      },
      token,
    );

    const result = await commitMediaRevision(revision.id, token);
    return { media: result.media, failures };
  } catch (error) {
    // A rate limit is temporary and does not mean the revision itself is bad.
    // Leave it resumable instead of issuing another request into a busy system.
    if (!(error instanceof ApiRateLimitError)) {
      await cancelMediaRevision(revision.id, token).catch(() => undefined);
    }
    throw error;
  }
}
