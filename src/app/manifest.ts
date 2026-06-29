import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'PingMe — Modern Chat Application',
    short_name: 'PingMe',
    description: 'A beautiful, real-time chat application with end-to-end encryption, voice & video calls, and modern UI.',
    start_url: '/chat',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0f172a',
    theme_color: '#3b82f6',
    icons: [
      { src: '/icons/icon-16x16.png', sizes: '16x16', type: 'image/png' },
      { src: '/icons/icon-32x32.png', sizes: '32x32', type: 'image/png' },
      { src: '/icons/icon-48x48.png', sizes: '48x48', type: 'image/png' },
      { src: '/icons/icon-72x72.png', sizes: '72x72', type: 'image/png' },
      { src: '/icons/icon-96x96.png', sizes: '96x96', type: 'image/png' },
      { src: '/icons/icon-128x128.png', sizes: '128x128', type: 'image/png' },
      { src: '/icons/icon-144x144.png', sizes: '144x144', type: 'image/png' },
      { src: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png' },
      { src: '/icons/icon-180x180.png', sizes: '180x180', type: 'image/png' },
      { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-384x384.png', sizes: '384x384', type: 'image/png' },
      { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/monochrome-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'monochrome' }
    ],
    shortcuts: [
      {
        name: 'New Chat',
        short_name: 'Chat',
        description: 'Start a new conversation',
        url: '/chat',
        icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }]
      },
      {
        name: 'Search Users',
        short_name: 'Search',
        description: 'Find friends and connect',
        url: '/requests',
        icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }]
      }
    ]
  };
}
