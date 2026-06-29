"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  User as UserIcon,
} from "lucide-react";
import { useSocket } from "@/providers/SocketProvider";
import { useCallStore } from "@/stores/useCallStore";
import { getInitials } from "@/lib/utils";
import { toast } from "sonner";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:global.stun.twilio.com:3478" },
  ],
};

export function CallModal() {
  const { data: session } = useSession();
  const { emit, on, off } = useSocket();
  const {
    isInCall,
    isIncoming,
    callType,
    remoteUserId,
    remoteUser,
    isMuted,
    isCameraOff,
    acceptCall,
    endCall,
    toggleMute,
    toggleCamera,
    receiveCall,
  } = useCallStore();

  const [callDuration, setCallDuration] = useState(0);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const currentUserId = (session?.user as Record<string, unknown>)?.id as string;

  // Stop local tracks
  const stopTracks = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
  }, []);

  // End call handle
  const handleEndCall = useCallback(() => {
    if (remoteUserId) {
      emit("call:end", { to: remoteUserId });
    }
    stopTracks();
    endCall();
    setCallDuration(0);
  }, [remoteUserId, emit, stopTracks, endCall]);

  // Socket event listeners for incoming signals
  useEffect(() => {
    const handleIncomingCall = (data: unknown) => {
      const payload = data as {
        from: string;
        offer: RTCSessionDescriptionInit;
        callType: "voice" | "video";
        caller: { id: string; displayName: string; image?: string };
      };
      if (isInCall || isIncoming) {
        emit("call:reject", { to: payload.from });
        return;
      }
      // Store caller info
      receiveCall(
        ((payload.caller || { id: payload.from, displayName: "Caller", isOnline: true }) as unknown) as import("@/types").User,
        payload.callType
      );
      // Store offer for accepting later
      (window as unknown as Record<string, unknown>)._pendingOffer = payload.offer;
    };

    const handleAnswered = async (data: unknown) => {
      const payload = data as { answer: RTCSessionDescriptionInit };
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(
          new RTCSessionDescription(payload.answer)
        );
      }
    };

    const handleIceCandidate = async (data: unknown) => {
      const payload = data as { candidate: RTCIceCandidateInit };
      if (peerConnectionRef.current && payload.candidate) {
        try {
          await peerConnectionRef.current.addIceCandidate(
            new RTCIceCandidate(payload.candidate)
          );
        } catch {
          // Ignore candidate errors
        }
      }
    };

    const handleEnded = () => {
      toast.info("Call ended");
      stopTracks();
      endCall();
      setCallDuration(0);
    };

    const handleRejected = () => {
      toast.error("Call declined");
      stopTracks();
      endCall();
      setCallDuration(0);
    };

    on("call:incoming", handleIncomingCall);
    on("call:answered", handleAnswered);
    on("call:ice-candidate", handleIceCandidate);
    on("call:ended", handleEnded);
    on("call:rejected", handleRejected);

    return () => {
      off("call:incoming", handleIncomingCall);
      off("call:answered", handleAnswered);
      off("call:ice-candidate", handleIceCandidate);
      off("call:ended", handleEnded);
      off("call:rejected", handleRejected);
    };
  }, [isInCall, isIncoming, on, off, emit, receiveCall, stopTracks, endCall]);

  // Start outgoing call stream setup
  useEffect(() => {
    if (isInCall && !isIncoming && remoteUserId && !peerConnectionRef.current) {
      const startOutgoing = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: callType === "video",
          });
          localStreamRef.current = stream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }

          const pc = new RTCPeerConnection(ICE_SERVERS);
          peerConnectionRef.current = pc;

          stream.getTracks().forEach((track) => pc.addTrack(track, stream));

          pc.ontrack = (event) => {
            if (remoteVideoRef.current && event.streams[0]) {
              remoteVideoRef.current.srcObject = event.streams[0];
            }
          };

          pc.onicecandidate = (event) => {
            if (event.candidate) {
              emit("call:ice-candidate", {
                to: remoteUserId,
                candidate: event.candidate,
              });
            }
          };

          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          emit("call:offer", {
            to: remoteUserId,
            offer,
            callType,
            caller: {
              id: currentUserId,
              displayName: (session?.user as Record<string, unknown>)?.displayName || "User",
              image: session?.user?.image,
            },
          });
        } catch {
          toast.error("Could not access camera or microphone");
          handleEndCall();
        }
      };

      startOutgoing();
    }
  }, [isInCall, isIncoming, remoteUserId, callType, currentUserId, session, emit, handleEndCall]);

  // Timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isInCall && !isIncoming) {
      timer = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isInCall, isIncoming]);

  // Toggle Mute Track
  useEffect(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !isMuted;
      });
    }
  }, [isMuted]);

  // Toggle Video Track
  useEffect(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !isCameraOff;
      });
    }
  }, [isCameraOff]);

  const handleAccept = async () => {
    acceptCall();
    if (!remoteUserId) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === "video",
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          emit("call:ice-candidate", {
            to: remoteUserId,
            candidate: event.candidate,
          });
        }
      };

      const offer = (window as unknown as Record<string, unknown>)._pendingOffer as RTCSessionDescriptionInit;
      if (offer) {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        emit("call:answer", {
          to: remoteUserId,
          answer,
        });
      }
    } catch {
      toast.error("Could not access camera or microphone");
      handleEndCall();
    }
  };

  const handleReject = () => {
    if (remoteUserId) {
      emit("call:reject", { to: remoteUserId });
    }
    stopTracks();
    endCall();
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (!isInCall && !isIncoming) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="relative w-full max-w-4xl h-[80vh] max-h-[600px] rounded-3xl bg-card border border-border overflow-hidden shadow-2xl flex flex-col"
        >
          {/* Header info */}
          <div className="absolute top-6 left-6 z-10 flex items-center gap-3 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-medium text-white">
              {isIncoming ? "Incoming Call..." : formatDuration(callDuration)}
            </span>
          </div>

          {/* Videos Container */}
          <div className="flex-1 relative bg-black/90 flex items-center justify-center">
            {/* Remote Video / Avatar */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              controls={false}
              className={`w-full h-full object-cover ${
                callType === "voice" || isIncoming ? "hidden" : ""
              }`}
            />
            {(callType === "voice" || isIncoming) && (
              <div className="flex flex-col items-center justify-center gap-4">
                <div className="relative">
                  {remoteUser?.image ? (
                    <img
                      src={remoteUser.image}
                      alt={remoteUser.displayName}
                      className="w-28 h-28 rounded-full object-cover border-4 border-primary shadow-xl"
                    />
                  ) : (
                    <div className="w-28 h-28 rounded-full bg-primary/20 flex items-center justify-center text-4xl font-bold text-primary border-4 border-primary shadow-xl">
                      {remoteUser ? getInitials(remoteUser.displayName) : <UserIcon />}
                    </div>
                  )}
                  {isIncoming && (
                    <div className="absolute -inset-2 rounded-full border-2 border-primary animate-ping opacity-75" />
                  )}
                </div>
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-white">
                    {remoteUser?.displayName || "User"}
                  </h3>
                  <p className="text-sm text-gray-400 capitalize mt-1">
                    {isIncoming ? `Incoming ${callType} call` : `${callType} call in progress`}
                  </p>
                </div>
              </div>
            )}

            {/* Local Video Picture-in-Picture */}
            {callType === "video" && !isIncoming && (
              <motion.div
                drag
                dragConstraints={{ left: -300, right: 300, top: -200, bottom: 200 }}
                className="absolute bottom-6 right-6 w-36 h-48 md:w-48 md:h-64 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-black z-20 cursor-move"
              >
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  controls={false}
                  className={`w-full h-full object-cover ${isCameraOff ? "hidden" : ""}`}
                />
                {isCameraOff && (
                  <div className="w-full h-full flex items-center justify-center bg-gray-900 text-gray-400 text-xs">
                    Camera Off
                  </div>
                )}
              </motion.div>
            )}
          </div>

          {/* Control Bar */}
          <div className="p-6 bg-card/90 backdrop-blur-xl border-t border-border flex items-center justify-center gap-6">
            {isIncoming ? (
              <>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleReject}
                  className="px-8 py-4 rounded-full bg-red-500 hover:bg-red-600 text-white font-semibold flex items-center gap-2 shadow-lg transition-colors"
                >
                  <PhoneOff className="w-5 h-5" /> Decline
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleAccept}
                  className="px-8 py-4 rounded-full bg-green-500 hover:bg-green-600 text-white font-semibold flex items-center gap-2 shadow-lg transition-colors animate-bounce"
                >
                  <Phone className="w-5 h-5" /> Accept
                </motion.button>
              </>
            ) : (
              <>
                <button
                  onClick={toggleMute}
                  className={`p-4 rounded-full transition-colors ${
                    isMuted
                      ? "bg-red-500/20 text-red-500 border border-red-500/30"
                      : "bg-secondary hover:bg-secondary/80 text-foreground"
                  }`}
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </button>

                {callType === "video" && (
                  <button
                    onClick={toggleCamera}
                    className={`p-4 rounded-full transition-colors ${
                      isCameraOff
                        ? "bg-red-500/20 text-red-500 border border-red-500/30"
                        : "bg-secondary hover:bg-secondary/80 text-foreground"
                    }`}
                    title={isCameraOff ? "Turn Camera On" : "Turn Camera Off"}
                  >
                    {isCameraOff ? <VideoOff className="w-6 h-6" /> : <VideoIcon className="w-6 h-6" />}
                  </button>
                )}

                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleEndCall}
                  className="p-4 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg transition-colors"
                  title="End Call"
                >
                  <PhoneOff className="w-6 h-6" />
                </motion.button>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
