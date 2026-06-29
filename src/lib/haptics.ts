export const triggerHaptic = (type: 'light' | 'medium' | 'heavy' | 'success' = 'light') => {
  if (typeof window === 'undefined' || !('vibrate' in navigator)) return;
  try {
    switch (type) {
      case 'light':
        navigator.vibrate(10);
        break;
      case 'medium':
        navigator.vibrate(20);
        break;
      case 'heavy':
        navigator.vibrate(35);
        break;
      case 'success':
        navigator.vibrate([10, 30, 15]);
        break;
    }
  } catch {
    // Ignore vibration failures
  }
};
