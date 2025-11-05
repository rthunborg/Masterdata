# Responsive Design Breakpoints

## Overview

The HR Masterdata Management System implements a mobile-first responsive design strategy with specific breakpoints optimized for various device sizes and orientations.

## Breakpoint Strategy

### Tailwind CSS Breakpoints

```typescript
sm: 640px   // Small devices (landscape phones)
md: 768px   // Medium devices (tablets)
lg: 1024px  // Large devices (desktops, landscape tablets)
xl: 1280px  // Extra large devices (large desktops)
2xl: 1536px // 2X extra large devices (larger desktops)
```

### Application Breakpoints

| Breakpoint        | Width Range     | Description                       | Layout Strategy                                    |
| ----------------- | --------------- | --------------------------------- | -------------------------------------------------- |
| **Mobile XS**     | 320px - 374px   | iPhone SE, small Android          | Compact layout, vertical stacking, text truncation |
| **Mobile**        | 375px - 767px   | iPhone 12/13/14, standard Android | Single column, card views, mobile navigation       |
| **Tablet**        | 768px - 1023px  | iPad, Android tablets             | Two-column forms, still uses mobile navigation     |
| **Desktop Small** | 1024px - 1279px | iPad Pro landscape, small laptops | Desktop navigation, table views, compact spacing   |
| **Desktop**       | 1280px+         | Standard desktops, large displays | Full table views, multi-column layouts             |

## Critical Breakpoint: 1024px (lg)

**Below 1024px**: Mobile experience

- Hamburger navigation menu
- Card list views for employees/users
- Full-screen or near full-screen modals
- Single-column forms
- Touch-optimized interactions (44px+ touch targets)

**At/Above 1024px**: Desktop experience

- Horizontal navigation bar
- Table views with all columns
- Centered modal dialogs
- Multi-column forms
- Mouse-optimized interactions (36px buttons)

## Component Behavior by Breakpoint

### Navigation

| Component      | < 1024px (Mobile)        | ≥ 1024px (Desktop)       |
| -------------- | ------------------------ | ------------------------ |
| MobileNav      | Visible - hamburger menu | Hidden                   |
| Desktop Nav    | Hidden                   | Visible - horizontal bar |
| Logo Height    | 32px (sm), 40px (md)     | 40px                     |
| Header Padding | py-2 sm:py-3             | py-3                     |

### Employee View

| Component | < 1024px (Mobile)       | ≥ 1024px (Desktop)  |
| --------- | ----------------------- | ------------------- |
| View Type | EmployeeCardList        | EmployeeTable       |
| Layout    | Single column cards     | Multi-column table  |
| Actions   | Buttons on each card    | Dropdown menu       |
| Search    | Integrated in card list | Separate search bar |

### Forms & Modals

| Component    | < 768px (Mobile)      | 768px - 1023px (Tablet) | ≥ 1024px (Desktop)   |
| ------------ | --------------------- | ----------------------- | -------------------- |
| Modal Size   | Full-screen (inset-4) | Near full-screen        | Centered (max-w-2xl) |
| Form Layout  | Single column         | 2 columns               | 2 columns            |
| Input Height | h-12 (48px)           | h-10 (40px)             | h-10 (40px)          |
| Button Size  | h-11 (44px)           | h-9 (36px)              | h-9 (36px)           |

### Touch Targets

| Element           | Mobile (< 1024px) | Desktop (≥ 1024px) |
| ----------------- | ----------------- | ------------------ |
| Buttons (default) | 44px (h-11)       | 36px (h-9)         |
| Buttons (small)   | 40px (h-10)       | 32px (h-8)         |
| Buttons (large)   | 48px (h-12)       | 40px (h-10)        |
| Icon buttons      | 44px (size-11)    | 36px (size-9)      |
| Nav links         | 48px (min-h-12)   | auto               |

## Media Queries

### Landscape Orientation (Phones)

```css
@media (max-width: 1023px) and (orientation: landscape) {
  /* Optimizations for phone landscape mode */
  - Reduced font size: 14px
  - Compact header padding: py-2
  - Reduced card padding: 0.75rem
}
```

### Small Phones (≤374px)

```css
@media (max-width: 374px) {
  /* Optimizations for small devices */
  - Reduced padding: 0.75rem
  - Text truncation on headings
  - Vertical button stacking
}
```

### Large Tablets (1024px-1279px)

```css
@media (min-width: 1024px) and (max-width: 1279px) {
  /* Hybrid layout */
  - Desktop navigation active
  - Compact spacing: 1.5rem
  - Smaller table font: 15px
}
```

### Touch vs Mouse Devices

```css
@media (hover: none) and (pointer: coarse) {
  /* Touch-only devices */
  - Disable hover effects
  - Enable touch feedback (opacity)
}
```

## useMediaQuery Hook

Custom React hook for responsive behavior:

```typescript
const isMobile = useMediaQuery('(max-width: 1023px)');
```

**Usage**:

- `ResponsiveEmployeeView` - Switches between table and card view
- `ResponsiveUserView` - User management table/card toggle
- Any component needing mobile/desktop variant

## Typography Scaling

Responsive font sizes using CSS clamp():

```css
body {
  /* Scales from 14px (mobile) to 16px (desktop) */
  font-size: clamp(0.875rem, 0.8rem + 0.375vw, 1rem);
}
```

## Testing Breakpoints

### Chrome DevTools Device Sizes

Test these specific viewport widths:

- **320px** - Smallest phones (iPhone SE 1st gen)
- **375px** - iPhone SE 2nd/3rd gen, iPhone 12/13 mini
- **390px** - iPhone 12/13/14 standard
- **393px** - Pixel 5
- **768px** - iPad portrait
- **1024px** - iPad Pro portrait, **critical breakpoint**
- **1280px** - Standard laptop
- **1440px** - Large desktop

### Real Device Testing Priority

1. **iPhone 12/13/14** (390px) - Most common iOS device
2. **Samsung/Pixel** (360-393px) - Common Android sizes
3. **iPad** (768px portrait, 1024px landscape) - Tablet testing
4. **iPad Pro 11"** (1024px critical breakpoint test)

## Performance Considerations

### Mobile Optimization

- Images served in WebP format
- Responsive image sizes (16px - 3840px)
- Loading states with skeleton screens
- Lazy loading of admin routes
- Touch manipulation CSS (removes 300ms delay)
- No hover effects on touch devices

### Bundle Size Targets

- **First Load JS**: < 200KB
- **Route-level code splitting**: Enabled via Next.js App Router
- **Admin components**: Lazy loaded
- **Bundle analyzer**: Run `pnpm build:analyze`

## Accessibility

### WCAG 2.1 AA Compliance

- **Touch targets**: Minimum 44x44px (mobile), 36x36px (desktop)
- **Text scaling**: Readable up to 200% zoom
- **Color contrast**: 4.5:1 for normal text, 3:1 for large text
- **Focus indicators**: 2px outline visible on :focus-visible
- **Screen reader**: All interactive elements properly labeled

## Edge Cases Handled

1. **Very small screens (320px)**: Text truncation, reduced padding
2. **Landscape phones**: Compact layout, reduced vertical space
3. **Large tablets (1024-1280px)**: Hybrid desktop/mobile layout
4. **Zoom 200%**: Touch targets don't overlap, text remains readable
5. **Orientation changes**: Smooth transitions, no layout breaks

## Future Enhancements

Optional features not yet implemented:

- Pull-to-refresh on mobile
- Swipe gestures for actions
- Progressive Web App (PWA) with service worker
- Offline mode support
- Column visibility controls for mobile table

---

**Last Updated**: 2025-11-05  
**Version**: 1.0  
**Story**: 8.1 Mobile Responsive Design
