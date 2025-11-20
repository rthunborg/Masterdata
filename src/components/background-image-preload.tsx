'use client';

import { useEffect } from 'react';

export function BackgroundImagePreload({ src }: { src: string }) {
  useEffect(() => {
    // Check if preload link already exists
    const existingLink = document.querySelector(`link[rel="preload"][href="${src}"]`);
    if (existingLink) {
      return; // Already exists, no need to add again
    }

    // Create and append preload link to head for early image loading
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = src;
    link.setAttribute('fetchpriority', 'high');
    // Insert at the beginning of head for highest priority
    document.head.insertBefore(link, document.head.firstChild);
  }, [src]);

  return null;
}
