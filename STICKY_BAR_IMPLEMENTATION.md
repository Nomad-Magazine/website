# Sticky Announcement Bar - Implementation Summary

## Overview
A non-intrusive sticky bar at the bottom of the homepage that automatically rotates through announcements, directory entries, and latest articles.

## Key Features

### Smart Behavior
- **Appears after scrolling 300px** - doesn't interfere with initial page view
- **Auto-rotates every 5 seconds** - cycles through all items automatically
- **Pauses on hover** - lets users read comfortably
- **Manual navigation** - clickable dots to jump to specific items
- **Dismissible** - close button (remembers choice for session)
- **Smooth animations** - elegant transitions between items

### Design (Matches Your Style)
- **Dark gradient background** (`#171717` to `#262626`)
- **Yellow accent color** (`#fbbf24`) for hover states and badges
- **Subtle border** with shadow for depth
- **Clean typography** - readable but not distracting
- **Mobile responsive** - adapts to small screens

### Content Structure
Currently shows **9 items** rotating:

**Announcements (4 items)**:
1. Casa Marianas Hiring - badge: HIRING
2. Nomad Experience Japan - badge: EVENT
3. Wonder House Coliving Manager - badge: OPPORTUNITY
4. Nomadicards Handover - badge: NEW

**Directory Entries (3 items)**:
- Top 3 featured/supporter entries from Nomad Directory
- Shows company name + category
- Badge: SUPPORTER / FEATURED / NEW

**Latest Articles (2 items)**:
- Most recent published articles
- Badge: ARTICLE

## User Experience

### Visual Flow
1. User lands on page → bar hidden
2. User scrolls down 300px → bar slides up from bottom
3. Bar shows first item for 5 seconds
4. Automatically transitions to next item
5. User can hover to pause or click dots to navigate
6. User can close bar (won't show again this session)

### Interaction States
- **Default**: Shows current item with active dot highlighted
- **Hover**: Pauses auto-rotation, item text turns yellow
- **Click dot**: Jumps to that item, pauses for 10 seconds
- **Click item**: Opens link (new tab for external, same tab for internal)
- **Click close**: Hides bar for entire session

## Technical Details

### Positioning
- `position: fixed` at bottom of viewport
- `z-index: 50` (above content, below modals)
- Full width with max-width container

### Animation
- Slide up entrance: `transform: translateY(100%)` → `translateY(0)`
- Item transitions: CSS transform with 0.5s ease-in-out
- Dot expansion: Active dot grows from 0.5rem to 1.5rem width

### Performance
- Uses CSS transforms (GPU accelerated)
- Minimal JavaScript (only for rotation logic)
- Session storage for close state
- No layout shifts

### Accessibility
- Proper ARIA labels on all interactive elements
- Keyboard navigable dots (role="tab")
- Respects `prefers-reduced-motion`
- Screen reader friendly

## SEO Compliance
- All internal links use trailing slashes (/)
- External links have `rel="noopener noreferrer"`
- Semantic HTML structure
- No impact on Core Web Vitals

## Mobile Optimization
- Hides "Updates" text label on mobile
- Smaller font sizes (0.75rem)
- Reduced padding and gaps
- Touch-friendly tap targets

## Customization

### To Update Content
Edit `stickyBarItems` array in `src/pages/index.astro`:
```typescript
const stickyBarItems = [
  {
    type: 'announcement',
    title: 'Your announcement here',
    link: '/your-link/',
    badge: 'NEW'
  },
  // ... more items
]
```

### To Adjust Timing
In `StickyAnnouncementBar.astro`:
- Change rotation speed: Line 197 (`5000` = 5 seconds)
- Change scroll trigger: Line 280 (`300` = 300px)
- Change pause duration: Line 210 (`10000` = 10 seconds)

### To Modify Appearance
Edit CSS in `StickyAnnouncementBar.astro`:
- Background: `.sticky-bar` gradient
- Colors: Yellow (`#fbbf24`), Dark (`#171717`)
- Spacing: `.sticky-bar-container` padding

## Browser Support
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Graceful degradation for older browsers
- Works with JavaScript disabled (shows first item only)

## Future Enhancements (Optional)
- Pull announcements from CMS/database
- A/B test different rotation speeds
- Click tracking analytics
- Swipe gestures on mobile
- Preview mode for admins
- Scheduled announcements (show/hide by date)

## Files
- **Component**: `src/components/StickyAnnouncementBar.astro`
- **Usage**: `src/pages/index.astro` (bottom of file)
- **Data**: `stickyBarItems` array in index.astro

## Notes
- Bar remembers if user closed it (session storage)
- Auto-rotation pauses during user interaction
- Smooth entrance animation on scroll
- No conflicts with existing sticky elements
