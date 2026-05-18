# Design System — DNA Care v2

## Direction
Multi-tenancy admin base. Clean, professional, approachable. Emerald brand accent on neutral infrastructure.

## Feel
Precision without coldness. Like a well-organized workspace — everything has a place, nothing shouts.

## Depth Strategy
**Borders + whisper shadows.** Cards get `shadow-sm` (barely perceptible lift). Dropdowns get `shadow-md`. Sidebar uses border-right only (no shadow or bg shift).

## Surface Hierarchy
- **Canvas:** `hsl(220 14% 96%)` — faint cool off-white
- **Surface (cards, sidebar):** `hsl(0 0% 100%)` — white
- **Input:** `hsl(220 14% 94%)` — inset feel

## Spacing
Base unit: 4px. Tailwind default scale.

## Border Radius
- Inputs/buttons: `rounded-lg` (8px)
- Cards: `rounded-xl` (12px)
- Modals: `rounded-2xl` (16px)

## Typography
System font stack (Inter / SF / Segoe). No custom font to keep neutral.

## Key Components

### Metric Card
- Left status strip (3px wide, colored by metric type)
- Value: `text-2xl font-semibold text-ink`
- Label: `text-sm text-ink-tertiary`
- Trend: inline arrow + percentage

### Sidebar
- Background matches canvas (white)
- Only `border-r border-edge` separates
- Active item: `text-brand` + `font-medium` + subtle left bar

### Header
- White bg + bottom border
- Left: app name + tenant badge
- Right: notification bell + user menu

### Tenant Badge
- Small colored dot + tenant slug
- Used in tables and headers to add multi-tenancy context

## Colors
- Brand: emerald (`hsl(160 60% 40%)`)
- Canvas: `hsl(220 14% 96%)`
- Ink: 4-level hierarchy (primary → secondary → tertiary → muted)
- Edge: 3-level (standard → soft → emphasis)
- Semantic: success (emerald), warning (amber), danger (coral red), info (blue)
