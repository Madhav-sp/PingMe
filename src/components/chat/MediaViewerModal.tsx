"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ZoomIn, ZoomOut, Download, Trash2, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";

export interface MediaItem {
  id: string;
  url: string;
  fileName?: string;
  type: string;
  senderId?: string;
}

interface MediaViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  mediaList: MediaItem[];
  initialIndex?: number;
  onDelete?: (id: string) => void;
  currentUserId?: string;
  onViewOnceClose?: (id: string, wasSaved: boolean) => void;
}

export function MediaViewerModal({
  isOpen,
  onClose,
  mediaList,
  initialIndex = 0,
  onDelete,
  currentUserId,
  onViewOnceClose,
}: MediaViewerModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [hasSaved, setHasSaved] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setCurrentIndex(initialIndex);
      setScale(1);
      setHasSaved(false);
    });
  }, [initialIndex, isOpen]);

  if (!isOpen || mediaList.length === 0) return null;

  const currentMedia = mediaList[currentIndex] || mediaList[0];

  const triggerViewOnceCheck = () => {
    if (onViewOnceClose && currentMedia) {
      onViewOnceClose(currentMedia.id, hasSaved);
    }
  };

  const handleModalClose = () => {
    triggerViewOnceCheck();
    onClose();
  };

  const handlePrev = () => {
    triggerViewOnceCheck();
    setHasSaved(false);
    setScale(1);
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : mediaList.length - 1));
  };

  const handleNext = () => {
    triggerViewOnceCheck();
    setHasSaved(false);
    setScale(1);
    setCurrentIndex((prev) => (prev < mediaList.length - 1 ? prev + 1 : 0));
  };

  const handleZoomIn = () => setScale((prev) => Math.min(3, prev + 0.5));
  const handleZoomOut = () => setScale((prev) => Math.max(0.5, prev - 0.5));
  const handleResetZoom = () => setScale(1);

  const handleDownload = async () => {
    setHasSaved(true);
    try {
      const response = await fetch(currentMedia.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = currentMedia.fileName || `pingme-media-${currentMedia.id}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      window.open(currentMedia.url, "_blank");
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-md select-none">
        {/* Top Bar */}
        <div className="flex items-center justify-between p-4 text-white z-10 bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/10">
              {currentIndex + 1} / {mediaList.length}
            </span>
            <span className="text-xs text-white/80 truncate max-w-xs md:max-w-md">
              {currentMedia.fileName || "Media Attachment"}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {currentMedia.type === "IMAGE" && (
              <>
                <button
                  onClick={handleZoomIn}
                  className="p-2 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={handleZoomOut}
                  className="p-2 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  onClick={handleResetZoom}
                  className="p-2 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors"
                  title="Reset Zoom"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </>
            )}

            <button
              onClick={handleDownload}
              className="p-2 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors"
              title="Download"
            >
              <Download className="w-4 h-4" />
            </button>

            {onDelete && currentMedia.senderId === currentUserId && (
              <button
                onClick={() => {
                  if (confirm("Delete this media?")) {
                    onDelete(currentMedia.id);
                    if (mediaList.length <= 1) handleModalClose();
                    else handleNext();
                  }
                }}
                className="p-2 rounded-lg hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors"
                title="Delete Media"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={handleModalClose}
              className="p-2 ml-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Close Viewer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Display Area */}
        <div className="flex-1 relative flex items-center justify-center overflow-hidden p-4">
          {mediaList.length > 1 && (
            <button
              onClick={handlePrev}
              className="absolute left-4 z-10 p-3 rounded-full bg-black/50 hover:bg-black/80 text-white border border-white/10 transition-all transform hover:scale-110"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          <motion.div
            key={currentMedia.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="max-w-full max-h-full flex items-center justify-center cursor-grab active:cursor-grabbing"
            drag={scale > 1}
            dragConstraints={{ left: -200, right: 200, top: -200, bottom: 200 }}
          >
            {currentMedia.type === "IMAGE" ? (
              <img
                src={currentMedia.url}
                alt="Media"
                className="max-w-[90vw] max-h-[80vh] object-contain rounded-lg shadow-2xl"
              />
            ) : currentMedia.type === "VIDEO" || currentMedia.url.endsWith(".mp4") ? (
              <video
                src={currentMedia.url}
                controls
                autoPlay
                className="max-w-[90vw] max-h-[80vh] rounded-lg shadow-2xl"
              />
            ) : (
              <div className="p-12 bg-white/10 rounded-2xl text-white text-center">
                <p className="text-sm font-semibold mb-2">Unsupported Preview Format</p>
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold"
                >
                  Download File
                </button>
              </div>
            )}
          </motion.div>

          {mediaList.length > 1 && (
            <button
              onClick={handleNext}
              className="absolute right-4 z-10 p-3 rounded-full bg-black/50 hover:bg-black/80 text-white border border-white/10 transition-all transform hover:scale-110"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* Thumbnail Strip Gallery */}
        {mediaList.length > 1 && (
          <div className="p-3 bg-black/80 border-t border-white/10 flex items-center justify-center gap-2 overflow-x-auto max-w-full">
            {mediaList.map((item, idx) => (
              <button
                key={item.id}
                onClick={() => {
                  setScale(1);
                  setCurrentIndex(idx);
                }}
                className={`w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all ${
                  idx === currentIndex ? "border-primary scale-105 shadow-lg" : "border-transparent opacity-50 hover:opacity-100"
                }`}
              >
                {item.type === "IMAGE" ? (
                  <img src={item.url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-white/10 flex items-center justify-center text-[9px] text-white font-bold">
                    VID
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </AnimatePresence>
  );
}
