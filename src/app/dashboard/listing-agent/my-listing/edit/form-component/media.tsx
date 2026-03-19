/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { forwardRef, useImperativeHandle, useState } from "react";
import { toast } from "sonner";
import { ListingFormHandle } from "@/app/dashboard/vendor/my-listing/create/new-listing-content";
import { useListing } from "@/context/listing-form-context";
import { FileUploader } from "@/components/dashboard/listing/media-uploader";

interface Props {
  listingType: "business" | "event" | "community";
  listingSlug: string;
  listingId?: number | string;
}

// Helper to check if we need compression

const shouldCompressImage = (file: any): boolean => {
  // If it's not a File object (e.g., existing image from API), skip compression
  if (!file || typeof file !== 'object' || !('type' in file)) return false;
  
  // Only compress images, not videos
  if (!file.type.startsWith("image/")) return false;

  // Only compress if over 10MB
  return file.size > 10 * 1024 * 1024;
};

// Smart compression - only for large images

const smartCompressImage = async (file: any): Promise<any> => {
  // Skip compression for non-File objects (e.g., existing images from API)
  if (!file || typeof file !== 'object' || !('type' in file)) {
    return file;
  }
  
  if (!shouldCompressImage(file)) return file;

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_SIZE = 1920; // Keep good quality for large displays

        let width = img.width;
        let height = img.height;

        // Only resize if image is very large
        if (width > MAX_SIZE || height > MAX_SIZE) {
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File(
                [blob],
                file.name.replace(/\.[^/.]+$/, ".jpg"), // Change extension to .jpg
                { type: "image/jpeg", lastModified: Date.now() }
              );

              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          "image/jpeg",
          0.85 // 85% quality - keep good quality
        );
      };
      img.onerror = () => resolve(file); // Fallback to original
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(file); // Fallback to original
    reader.readAsDataURL(file);
  });
};

export const MediaUploadStep = forwardRef<ListingFormHandle, Props>(
  ({ listingSlug }, ref) => {
    const { media, setMedia } = useListing();
    const [isUploading, setIsUploading] = useState(false);

    const uploadWithChunking = async () => {
      // Check if we have cover photo (either new or existing)
      const hasNewCover = media.coverPhoto && typeof media.coverPhoto === 'object' && 'type' in media.coverPhoto;
      
      // Check if there are any new files to upload
      const countNewFiles = (files: unknown[]) => files.filter((f: unknown) => f && typeof f === 'object' && f !== null && 'type' in f).length;
      const newCoverCount = hasNewCover ? 1 : 0;
      const newGalleryCount = countNewFiles(media.images);
      const totalNewFiles = newCoverCount + newGalleryCount;
      
      // If no new files to upload, allow proceeding
      if (totalNewFiles === 0) {
        return true;
      }

      try {
        setIsUploading(true);
        const token = localStorage.getItem("authToken");
        const API_URL = process.env.API_URL || "https://me-fie.co.uk";

        // Prepare all files in correct order
        const allFiles: any[] = [media.coverPhoto, ...media.images];
        
        // Filter to only include new files (File objects), not existing images
        const newFiles = allFiles.filter((file) => {
          return file && typeof file === 'object' && 'type' in file;
        }) as File[];
        
        // Filter to only include new files

        // Smart compression - only compress large images
        toast.loading("Optimizing files for upload...");
        const optimizedFiles = await Promise.all(
          newFiles.map(smartCompressImage)
        );


        // Strategy: Try to upload all at once first, fallback to chunking if fails
        const attemptBulkUpload = async (files: File[]): Promise<boolean> => {
          try {
            toast.loading(`Uploading ${files.length} file(s)...`);

            const formData = new FormData();
            files.forEach((file) => {
              formData.append("media[]", file);
            });

            // Add metadata
            formData.append("upload_strategy", "bulk");
            formData.append("total_files", files.length.toString());

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

            const response = await fetch(
              `${API_URL}/api/listing/${listingSlug}/media`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${token}`,
                  Accept: "application/json",
                },
                body: formData,
                signal: controller.signal,
              }
            );

            clearTimeout(timeoutId);

            if (response.status === 413) {

              return false;
            }

            if (!response.ok) {
              const error = await response.json();
              throw new Error(error.message || "Bulk upload failed");
            }

            return true;
          } catch (error) {
            if (error instanceof Error && error.name === "AbortError") {
              // Timeout - will try chunked
            } else {
              // Will try chunked
            }
            return false;
          }
        };

        // Strategy 2: Chunked upload
        const uploadChunked = async (files: File[]): Promise<boolean> => {
          const uploadedFiles: { index: number; success: boolean }[] = [];
          const CHUNK_SIZE = 2; // Upload 2 files at a time

          for (let i = 0; i < files.length; i += CHUNK_SIZE) {
            const chunk = files.slice(i, i + CHUNK_SIZE);
            const chunkNumber = Math.floor(i / CHUNK_SIZE) + 1;
            const totalChunks = Math.ceil(files.length / CHUNK_SIZE);

            toast.loading(
              `Uploading chunk ${chunkNumber} of ${totalChunks}...`
            );

            try {
              const formData = new FormData();
              chunk.forEach((file) => {
                formData.append("media[]", file);
              });

              // Add chunk metadata
              formData.append("upload_strategy", "chunked");
              formData.append("chunk_index", chunkNumber.toString());
              formData.append("total_chunks", totalChunks.toString());
              formData.append("original_total_files", files.length.toString());

              const response = await fetch(
                `${API_URL}/api/listing/${listingSlug}/media_update`,
                {
                  method: "PATCH",
                  headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json",
                  },
                  body: formData,
                }
              );

              if (!response.ok) {
                const error = await response.json();
                throw new Error(
                  `Chunk ${chunkNumber} failed: ${
                    error.message || "Unknown error"
                  }`
                );
              }

              // Track success
              chunk.forEach((_, idx) => {
                uploadedFiles.push({ index: i + idx, success: true });
              });
            } catch (error) {
              console.error(`Failed to upload chunk ${chunkNumber}:`, error);

              // Mark chunk as failed
              chunk.forEach((_, idx) => {
                uploadedFiles.push({ index: i + idx, success: false });
              });

              toast.error(`Chunk ${chunkNumber} failed, continuing...`);
            }

            // Small delay between chunks
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }

          // Check results
          const failedUploads = uploadedFiles.filter((f) => !f.success);
          return failedUploads.length === 0;
        };

        // Try bulk upload first
        const bulkSuccess = await attemptBulkUpload(optimizedFiles);

        if (!bulkSuccess) {

          toast.info("Uploading in chunks for better reliability...");
          const chunkedSuccess = await uploadChunked(optimizedFiles);

          if (!chunkedSuccess) {
            throw new Error("Chunked upload failed");
          }
        }

        toast.success("All media files uploaded successfully!");
        return true;
      } catch (error) {
        console.error("Upload error:", error);
        toast.error(
          error instanceof Error ? error.message : "Media upload failed"
        );
        return false;
      } finally {
        setIsUploading(false);
        toast.dismiss();
      }
    };

    useImperativeHandle(ref, () => ({
      async submit() {
        // If there are new files, upload in background without waiting
        const hasNewCover = media.coverPhoto && typeof media.coverPhoto === 'object' && 'type' in media.coverPhoto;

        const hasNewGallery = media.images.some((f: any) => f && typeof f === 'object' && 'type' in f);
        
        if (hasNewCover || hasNewGallery) {
          // Start upload in background and don't await it
          uploadWithChunking().then((success) => {
            if (!success) {
              console.error("Background upload failed");
            }
          });
        }
        // Always return true to allow user to proceed immediately
        return true;
      },
    }));

    return (
      <div className="p-6 space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-1">Media Upload</h2>
          <p className="text-sm text-muted-foreground">
            Upload up to 4 media files (images or videos). First file will be the
            cover.
          </p>
          <div className="text-xs text-muted-foreground mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
            <p className="font-medium">Supported formats:</p>
            <ul className="list-disc pl-4 mt-1">
              <li>Images: JPEG, PNG, JPG, GIF, SVG</li>
              <li>Videos: MP4, MOV, AVI, WMV</li>
              <li>Max 50MB per file</li>
              <li>Large images will be automatically optimized</li>
            </ul>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="font-medium mb-2">Cover Media ( 1 Photo)</h3>
            <p className="text-sm text-muted-foreground mb-3">
              First file in upload queue. Best to use an image for best results.
            </p>
            <FileUploader
              label=""
              multiple={false}
              files={media.coverPhoto ? [media.coverPhoto] : []}
              onChange={(files) => setMedia({ ...media, coverPhoto: files[0] })}
              emptyText="Upload cover media"
              accept="image/jpeg,image/jpg,image/webp,video/mp4,video/quicktime,video/webm"
              maxSize={50 * 1024 * 1024} // 50MB limit
            />
          </div>

          <div>
            <h3 className="font-medium mb-2">Gallery Media ( Up to 3 Photos and videos)</h3>
            <p className="text-sm text-muted-foreground mb-3">
              These will be files 2-4 in the upload queue.
            </p>
            <FileUploader
              label=""
              files={media.images}
              onChange={(files) => setMedia({ ...media, images: files })}
              multiple={true}
              maxFiles={3}
              accept="image/jpeg,image/jpg,image/webp,video/mp4,video/quicktime,video/webp"
              maxSize={50 * 1024 * 1024} // 50MB limit
              emptyText="Upload 3 gallery media files"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>{media.images.length}/3 files selected</span>
              <span>Max 50MB per file</span>
            </div>
          </div>

          <div className="pt-4 border-t">
            <h3 className="font-medium mb-2">Upload Summary</h3>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span>Cover media:</span>
                <span
                  className={
                    media.coverPhoto ? "text-green-600" : "text-red-600"
                  }
                >
                  {media.coverPhoto ? "✓ Ready" : "✗ Missing"}
                  {media.coverPhoto &&
                    ` (${(media.coverPhoto.size / 1024 / 1024).toFixed(1)}MB)`}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Gallery media:</span>
                <span
                  className={
                    media.images.length === 3
                      ? "text-green-600"
                      : "text-amber-600"
                  }
                >
                  {media.images.length}/3 files
                  {media.images.length > 0 &&
                    ` (${(
                      media.images.reduce((sum, f) => sum + f.size, 0) /
                      1024 /
                      1024
                    ).toFixed(1)}MB total)`}
                </span>
              </div>
              <div className="flex justify-between font-medium mt-2 pt-2 border-t">
                <span>Total to upload:</span>
                <span>
                  {[media.coverPhoto, ...media.images].length}/4 files
                  {media.coverPhoto &&
                    ` (${(
                      [media.coverPhoto, ...media.images].reduce(
                        (sum, f) => sum + f.size,
                        0
                      ) /
                      1024 /
                      1024
                    ).toFixed(1)}MB)`}
                </span>
              </div>
              {isUploading && (
                <div className="mt-2 text-blue-600 text-xs">
                  ⏳ Uploading files (will try bulk first, then chunks if
                  needed)...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
);

MediaUploadStep.displayName = "MediaUploadStep";
