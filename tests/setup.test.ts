/**
 * Test Setup File
 * Polyfills for JSDOM environment
 */

import { beforeAll } from 'vitest';

// Polyfill for scrollIntoView (not available in JSDOM)
beforeAll(() => {
  Element.prototype.scrollIntoView = function() {};
  
  // Polyfill for HTMLElement.prototype.hasPointerCapture
  if (!HTMLElement.prototype.hasPointerCapture) {
    HTMLElement.prototype.hasPointerCapture = function() {
      return false;
    };
  }
  
  // Polyfill for HTMLElement.prototype.setPointerCapture
  if (!HTMLElement.prototype.setPointerCapture) {
    HTMLElement.prototype.setPointerCapture = function() {};
  }
  
  // Polyfill for HTMLElement.prototype.releasePointerCapture
  if (!HTMLElement.prototype.releasePointerCapture) {
    HTMLElement.prototype.releasePointerCapture = function() {};
  }
});
