'use client';

import { useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const SESSION_KEY = 'pingme_last_session';
const DRAFTS_KEY = 'pingme_drafts';

export function useSessionRestore() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // If currently on a conversation page, save it as last session
    if (pathname.startsWith('/chat/')) {
      const convId = pathname.replace('/chat/', '').split('/')[0];
      if (convId && convId !== 'undefined') {
        localStorage.setItem(SESSION_KEY, convId);
      }
    }
  }, [pathname]);

  const restoreLastSession = useCallback(() => {
    if (typeof window === 'undefined') return false;
    const lastConvId = localStorage.getItem(SESSION_KEY);
    if (lastConvId && pathname === '/chat') {
      router.push(`/chat/${lastConvId}`);
      return true;
    }
    return false;
  }, [pathname, router]);

  const saveDraft = useCallback((conversationId: string, text: string) => {
    if (typeof window === 'undefined' || !conversationId) return;
    try {
      const drafts = JSON.parse(localStorage.getItem(DRAFTS_KEY) || '{}');
      if (text.trim()) {
        drafts[conversationId] = text;
      } else {
        delete drafts[conversationId];
      }
      localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
    } catch {}
  }, []);

  const getDraft = useCallback((conversationId: string): string => {
    if (typeof window === 'undefined' || !conversationId) return '';
    try {
      const drafts = JSON.parse(localStorage.getItem(DRAFTS_KEY) || '{}');
      return drafts[conversationId] || '';
    } catch {
      return '';
    }
  }, []);

  return { restoreLastSession, saveDraft, getDraft };
}
