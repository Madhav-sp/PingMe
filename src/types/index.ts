export type MessageType = "TEXT" | "IMAGE" | "VIDEO" | "FILE" | "VOICE" | "AUDIO" | "GIF";
export type MessageStatus = "SENT" | "DELIVERED" | "READ";
export type RequestStatus = "PENDING" | "ACCEPTED" | "REJECTED";
export type NotificationType =
  | "NEW_MESSAGE"
  | "MESSAGE_REQUEST"
  | "REQUEST_ACCEPTED"
  | "REQUEST_REJECTED"
  | "INCOMING_CALL";

export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  image: string | null;
  bio: string | null;
  lastSeen: string;
  isOnline: boolean;
  keepArchived?: boolean;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  content: string;
  type: MessageType;
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  replyToId?: string | null;
  replyTo?: Message | null;
  status: MessageStatus;
  isEdited: boolean;
  deletedForAll: boolean;
  deletedForIds?: string[];
  expiresAt?: string | null;
  reactions: Reaction[];
  createdAt: string;
  updatedAt: string;
  // client-side only
  tempId?: string;
  isPending?: boolean;
}

export interface Reaction {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
}

export interface Conversation {
  id: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
  participant: User;
  unreadCount: number;
  isArchived?: boolean;
  disappearingMode?: string;
}

export interface ChatRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: RequestStatus;
  message: string | null;
  createdAt: string;
  sender: User;
  receiver: User;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface CallState {
  isInCall: boolean;
  isIncoming: boolean;
  callType: "voice" | "video";
  remoteUserId: string | null;
  remoteUser: User | null;
  isMuted: boolean;
  isCameraOff: boolean;
  callStartTime: number | null;
}

export interface TypingState {
  userId: string;
  conversationId: string;
  isTyping: boolean;
}

export interface OnlineStatusUpdate {
  userId: string;
  isOnline: boolean;
  lastSeen: string;
}
