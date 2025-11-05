# Mobile Testing Guide

## Overview

This guide provides comprehensive instructions for testing the HR Masterdata Management System's mobile responsive design implementation across various devices, browsers, and network conditions.

## Responsive Breakpoints

The application uses the following breakpoints:

- **Mobile Small**: 320px - 374px (iPhone SE, small Android phones)
- **Mobile**: 375px - 767px (iPhone 12/13/14, standard Android phones)
- **Tablet**: 768px - 1023px (iPad Mini, small tablets)
- **Desktop Small**: 1024px - 1279px (iPad Pro, large tablets)
- **Desktop**: 1280px+ (laptops, desktops)

**Critical Breakpoint**: 1024px (lg) - Below this, mobile navigation is used; above this, desktop navigation is displayed.

## Test Devices & Browsers

### Required Tests

#### iOS Devices

- **iPhone SE (2nd/3rd gen)** - 375px width
  - Safari (primary)
  - Chrome iOS
- **iPhone 12/13/14** - 390px width
  - Safari (primary)
  - Chrome iOS
- **iPad** - 768px width (portrait), 1024px width (landscape)
  - Safari (primary)
  - Chrome iOS

#### Android Devices

- **Small Android Phone** - 360px width
  - Chrome (primary)
  - Firefox
- **Standard Android Phone** - 393px width (Pixel 5)
  - Chrome (primary)
  - Firefox
- **Android Tablet** - 800px+ width
  - Chrome (primary)

### Browser Testing Matrix

| Device Type    | Safari     | Chrome      | Firefox     |
| -------------- | ---------- | ----------- | ----------- |
| iPhone         | ✅ Primary | ✅ Required | N/A         |
| iPad           | ✅ Primary | ✅ Required | N/A         |
| Android Phone  | N/A        | ✅ Primary  | ✅ Required |
| Android Tablet | N/A        | ✅ Primary  | ✅ Optional |

## Testing Scenarios

### 1. Navigation Testing

**Mobile Navigation (< 1024px)**

- [ ] Hamburger menu icon visible in header
- [ ] Tapping hamburger opens slide-out drawer from left
- [ ] Navigation items display: Dashboard, Important Dates (HR only), User Management (HR only), Column Settings (HR only)
- [ ] Tapping navigation item navigates and closes drawer
- [ ] Tapping outside drawer closes it
- [ ] Touch targets are at least 48px high

**Desktop Navigation (≥ 1024px)**

- [ ] Horizontal navigation bar visible below header
- [ ] All navigation items display in a row
- [ ] Hover effects work on desktop
- [ ] Active page has visible indicator

### 2. Employee Table/Card View Testing

**Mobile Card View (< 1024px)**

- [ ] Employee data displays as cards, not table
- [ ] Each card shows: name, rank, status badge, email, phone
- [ ] "More" button expands to show additional details
- [ ] "Less" button collapses expanded details
- [ ] Archive/Restore/Terminate buttons visible for HR admins
- [ ] Search bar filters cards in real-time
- [ ] No horizontal scrolling required
- [ ] Text truncates with ellipsis if too long

**Desktop Table View (≥ 1024px)**

- [ ] Employee data displays in table format
- [ ] All columns visible and sortable
- [ ] Actions column with dropdown menu
- [ ] Global search filters table
- [ ] Column visibility controls work

### 3. Forms & Modals Testing

**Mobile Modals (< 768px)**

- [ ] Modals appear full-screen or near full-screen
- [ ] Close button easily tappable (top-right)
- [ ] Form fields in single column layout
- [ ] Input fields have 48px minimum height
- [ ] Email inputs show email keyboard
- [ ] Phone inputs show numeric keyboard
- [ ] No horizontal scrolling in modal
- [ ] Can scroll form content vertically

**Desktop Modals (≥ 768px)**

- [ ] Modals appear centered with overlay
- [ ] Form fields in 2-column layout where appropriate
- [ ] Modal has maximum width constraint

### 4. Touch Interaction Testing

**Touch Targets**

- [ ] All buttons meet 44x44px minimum size on mobile
- [ ] Navigation links are 48px tall
- [ ] Icon-only buttons have sufficient padding
- [ ] Links in cards are tappable
- [ ] No accidental taps due to small targets

**Touch Feedback**

- [ ] Buttons show visual feedback on tap (scale/opacity)
- [ ] No 300ms tap delay (fast response)
- [ ] No hover effects lingering after tap
- [ ] Active state visible during press

**Gesture Support**

- [ ] Can scroll cards/lists smoothly
- [ ] Pinch-to-zoom works (zoom not disabled)
- [ ] Can tap links in text (email, phone)

### 5. Orientation Testing

**Portrait Mode (Default)**

- [ ] All features accessible
- [ ] Navigation works correctly
- [ ] Forms display properly
- [ ] No layout breaks

**Landscape Mode (Phones)**

- [ ] Content adapts to wider viewport
- [ ] Navigation still accessible
- [ ] Header more compact
- [ ] Cards/forms use available width
- [ ] No weird spacing issues

### 6. Small Screen Testing (320-374px)

- [ ] No horizontal scrolling
- [ ] Text truncates appropriately
- [ ] Buttons stack vertically if needed
- [ ] Header elements don't overflow
- [ ] Logo scales down
- [ ] Critical content visible

### 7. Large Tablet Testing (1024-1280px)

- [ ] Desktop navigation visible at 1024px
- [ ] Table view active (not cards)
- [ ] Layout uses available space efficiently
- [ ] Spacing not too loose or tight
- [ ] Hybrid mobile/desktop experience

### 8. Performance Testing

**Network Throttling**

- [ ] Test on "Fast 3G" (DevTools Network throttling)
- [ ] Test on "Slow 4G"
- [ ] Measure Time to Interactive (target < 3s on 4G)
- [ ] Check for layout shifts during load

**Loading States**

- [ ] Skeleton loaders display during page navigation
- [ ] No blank screens or long waits
- [ ] Images load progressively

**Bundle Size**

- [ ] Run `pnpm build:analyze` to check bundle sizes
- [ ] First Load JS should be reasonable (target < 200KB)

### 9. Accessibility Testing

**Screen Reader Testing**

- [ ] Test with VoiceOver (iOS): Settings > Accessibility > VoiceOver
- [ ] Test with TalkBack (Android): Settings > Accessibility > TalkBack
- [ ] All buttons have proper labels
- [ ] Navigation makes sense with screen reader
- [ ] Form inputs have associated labels

**Keyboard Navigation (iPad with keyboard)**

- [ ] Can tab through all interactive elements
- [ ] Focus indicators visible
- [ ] Can activate buttons with Enter/Space
- [ ] No keyboard traps

**Visual Accessibility**

- [ ] Text scales up to 200% zoom
- [ ] Sufficient color contrast
- [ ] Touch targets don't overlap at 200% zoom

### 10. Lighthouse Audit

Run Lighthouse mobile audit in Chrome DevTools:

**Performance Target**: 80+

- [ ] First Contentful Paint < 1.5s
- [ ] Time to Interactive < 3s
- [ ] Cumulative Layout Shift < 0.1
- [ ] Largest Contentful Paint < 2.5s

**Accessibility Target**: 90+

- [ ] No color contrast issues
- [ ] All images have alt text
- [ ] Form inputs have labels
- [ ] No accessibility violations

**Best Practices Target**: 90+

- [ ] HTTPS enabled
- [ ] No console errors
- [ ] Images properly sized

**SEO Target**: 90+

- [ ] Meta viewport tag present
- [ ] Page titles exist
- [ ] No robots.txt blocking

## Testing Checklist by Page

### Dashboard (Employee List)

- [ ] Mobile: Card view with search
- [ ] Desktop: Table view with filters
- [ ] Search/filter works on both
- [ ] Archive/Restore/Terminate actions work
- [ ] Modal forms responsive
- [ ] Loading states display
- [ ] CSV import works

### Important Dates

- [ ] Mobile: Card list view with category filter
- [ ] Desktop: Table view with all features
- [ ] Add/Edit/Delete works on both
- [ ] CSV import responsive

### Admin: User Management

- [ ] Mobile: User cards with actions
- [ ] Desktop: User table
- [ ] Add user modal responsive
- [ ] Activate/Deactivate/Delete work

### Admin: Column Settings

- [ ] Desktop view works (not optimized for mobile)
- [ ] Drag-and-drop reordering (desktop only)
- [ ] Permission toggles work

## Common Issues to Check

- [ ] No horizontal scrolling on any screen size
- [ ] Header doesn't overlap content
- [ ] Footer (if present) displays correctly
- [ ] Toast notifications visible and readable
- [ ] Loading spinners centered and visible
- [ ] Error messages display properly
- [ ] Long text truncates instead of breaking layout
- [ ] Images don't cause layout shifts
- [ ] Buttons don't wrap awkwardly

## DevTools Responsive Testing

Use Chrome/Edge DevTools Device Toolbar:

1. **Open DevTools**: F12 or Cmd+Option+I
2. **Toggle Device Toolbar**: Cmd+Shift+M (Mac) or Ctrl+Shift+M (Windows)
3. **Test These Presets**:
   - iPhone SE (375x667)
   - iPhone 12 Pro (390x844)
   - iPad (768x1024)
   - iPad Pro (1024x1366)
   - Pixel 5 (393x851)
   - Samsung Galaxy S20 (360x800)
4. **Custom Sizes**:
   - 320px (smallest phones)
   - 375px (iPhone SE)
   - 1024px (breakpoint test)
   - 1280px (desktop)

## Reporting Issues

When reporting issues, include:

1. Device/Browser/Version
2. Screen size/viewport width
3. Page/Component affected
4. Steps to reproduce
5. Expected vs actual behavior
6. Screenshot or screen recording

## Sign-Off Checklist

Before marking mobile responsive design as complete:

- [ ] All critical user flows tested on real iOS device
- [ ] All critical user flows tested on real Android device
- [ ] Lighthouse mobile audit scores meet targets
- [ ] No blocking accessibility issues
- [ ] Performance acceptable on 4G network
- [ ] Cross-browser testing complete
- [ ] Edge cases tested (very small/large screens)
- [ ] Orientation changes handled gracefully
- [ ] Touch interactions feel natural and responsive

---

**Last Updated**: 2025-11-05  
**Version**: 1.0  
**Story**: 8.1 Mobile Responsive Design
