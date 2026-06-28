import { create } from "zustand";
import type { CallState, User } from "@/types";

interface CallStore extends CallState {
  startCall: (remoteUser: User, callType: "voice" | "video") => void;
  receiveCall: (remoteUser: User, callType: "voice" | "video") => void;
  acceptCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleCamera: () => void;
}

export const useCallStore = create<CallStore>((set) => ({
  isInCall: false,
  isIncoming: false,
  callType: "voice",
  remoteUserId: null,
  remoteUser: null,
  isMuted: false,
  isCameraOff: false,
  callStartTime: null,

  startCall: (remoteUser, callType) =>
    set({
      isInCall: true,
      isIncoming: false,
      callType,
      remoteUserId: remoteUser.id,
      remoteUser,
      isMuted: false,
      isCameraOff: callType === "voice",
      callStartTime: Date.now(),
    }),

  receiveCall: (remoteUser, callType) =>
    set({
      isInCall: false,
      isIncoming: true,
      callType,
      remoteUserId: remoteUser.id,
      remoteUser,
      isMuted: false,
      isCameraOff: callType === "voice",
      callStartTime: null,
    }),

  acceptCall: () =>
    set({
      isInCall: true,
      isIncoming: false,
      callStartTime: Date.now(),
    }),

  endCall: () =>
    set({
      isInCall: false,
      isIncoming: false,
      callType: "voice",
      remoteUserId: null,
      remoteUser: null,
      isMuted: false,
      isCameraOff: false,
      callStartTime: null,
    }),

  toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
  toggleCamera: () => set((state) => ({ isCameraOff: !state.isCameraOff })),
}));
