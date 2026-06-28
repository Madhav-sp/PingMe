"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, UploadCloud, RefreshCw, Send, FileText, Music } from "lucide-react";
import { formatBytes } from "@/lib/utils";

interface MediaUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: File | null;
  onSend: (data: { url: string; fileName: string; fileSize: number; type: string }) => void;
}

export function MediaUploadModal({ isOpen, onClose, file, onSend }: MediaUploadModalProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      queueMicrotask(() => {
        setPreviewUrl(url);
        setProgress(0);
        setError(null);
        setIsUploading(false);
      });
      return () => URL.revokeObjectURL(url);
    }
  }, [file]);

  if (!isOpen || !file) return null;

  const compressImage = (inputFile: File): Promise<File> => {
    return new Promise((resolve) => {
      if (!inputFile.type.startsWith("image/") || inputFile.size < 1024 * 1024) {
        return resolve(inputFile);
      }
      const img = new Image();
      img.src = URL.createObjectURL(inputFile);
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        const maxDim = 1920;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) return resolve(inputFile);
            resolve(new File([blob], inputFile.name, { type: inputFile.type }));
          },
          inputFile.type,
          0.82
        );
      };
      img.onerror = () => resolve(inputFile);
    });
  };

  const handleStartUpload = async () => {
    setIsUploading(true);
    setError(null);
    setProgress(5);

    try {
      const fileToUpload = await compressImage(file);
      const formData = new FormData();
      formData.append("file", fileToUpload);

      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded * 100) / e.total);
          setProgress(Math.max(5, Math.min(95, percent)));
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setProgress(100);
          try {
            const res = JSON.parse(xhr.responseText);
            let msgType = "FILE";
            if (file.type.startsWith("image/")) msgType = "IMAGE";
            else if (file.type.startsWith("video/")) msgType = "VIDEO";
            else if (file.type.startsWith("audio/")) msgType = "VOICE";

            setIsUploading(false);
            onSend({
              url: res.url,
              fileName: res.fileName || file.name,
              fileSize: res.fileSize || file.size,
              type: msgType,
            });
            onClose();
          } catch {
            setError("Failed to parse response");
            setIsUploading(false);
          }
        } else {
          try {
            const errRes = JSON.parse(xhr.responseText);
            setError(errRes.error || "Upload failed");
          } catch {
            setError(`Upload error (${xhr.status})`);
          }
          setIsUploading(false);
        }
      });

      xhr.addEventListener("error", () => {
        setError("Network error occurred during upload");
        setIsUploading(false);
      });

      xhr.addEventListener("abort", () => {
        setError("Upload cancelled");
        setIsUploading(false);
      });

      xhr.open("POST", "/api/upload");
      xhr.send(formData);
    } catch {
      setError("Error preparing file for upload");
      setIsUploading(false);
    }
  };

  const handleCancel = () => {
    if (isUploading && xhrRef.current) {
      xhrRef.current.abort();
    }
    onClose();
  };

  const renderPreviewIcon = () => {
    if (file.type.startsWith("image/") && previewUrl) {
      return (
        <img
          src={previewUrl}
          alt="Preview"
          className="max-h-64 rounded-xl object-contain border border-border bg-black/5 mx-auto"
        />
      );
    }
    if (file.type.startsWith("video/") && previewUrl) {
      return (
        <video
          src={previewUrl}
          controls
          className="max-h-64 rounded-xl border border-border bg-black mx-auto"
        />
      );
    }
    if (file.type.startsWith("audio/")) {
      return (
        <div className="flex flex-col items-center justify-center p-8 bg-secondary/30 rounded-xl gap-3">
          <Music className="w-12 h-12 text-primary animate-bounce" />
          <span className="text-xs font-semibold text-foreground">{file.name}</span>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-secondary/30 rounded-xl gap-3">
        <FileText className="w-12 h-12 text-muted-foreground" />
        <span className="text-xs font-semibold text-foreground truncate max-w-xs">{file.name}</span>
      </div>
    );
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/30">
            <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-primary" /> Send Attachment
            </h3>
            <button
              onClick={handleCancel}
              className="p-1 rounded-lg hover:bg-accent text-muted-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Preview Content */}
          <div className="p-5 flex flex-col items-center justify-center space-y-4">
            {renderPreviewIcon()}

            <div className="text-center w-full">
              <p className="text-xs font-medium text-foreground truncate">{file.name}</p>
              <p className="text-[11px] text-muted-foreground">{formatBytes(file.size)}</p>
            </div>

            {/* Progress Bar */}
            {isUploading && (
              <div className="w-full space-y-1.5 pt-2">
                <div className="flex justify-between text-[11px] font-medium text-muted-foreground">
                  <span>Uploading to Cloudinary...</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-200 rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="w-full p-3 rounded-xl bg-destructive/10 text-destructive text-xs font-medium flex items-center justify-between">
                <span>{error}</span>
                <button
                  onClick={handleStartUpload}
                  className="flex items-center gap-1 text-[11px] underline font-bold"
                >
                  <RefreshCw className="w-3 h-3" /> Retry
                </button>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="px-5 py-4 border-t border-border bg-muted/20 flex items-center justify-end gap-2">
            <button
              onClick={handleCancel}
              disabled={isUploading && progress > 95}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-accent transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleStartUpload}
              disabled={isUploading}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Uploading...
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" /> Send Now
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
