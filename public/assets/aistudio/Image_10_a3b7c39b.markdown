---
name: Academic Attendance & ERP Portal
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#444651'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#757682'
  outline-variant: '#c5c5d3'
  surface-tint: '#4059aa'
  primary: '#00236f'
  on-primary: '#ffffff'
  primary-container: '#1e3a8a'
  on-primary-container: '#90a8ff'
  inverse-primary: '#b6c4ff'
  secondary: '#0051d5'
  on-secondary: '#ffffff'
  secondary-container: '#316bf3'
  on-secondary-container: '#fefcff'
  tertiary: '#002d48'
  on-tertiary: '#ffffff'
  tertiary-container: '#004469'
  on-tertiary-container: '#56b3f9'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dce1ff'
  primary-fixed-dim: '#b6c4ff'
  on-primary-fixed: '#00164e'
  on-primary-fixed-variant: '#264191'
  secondary-fixed: '#dbe1ff'
  secondary-fixed-dim: '#b4c5ff'
  on-secondary-fixed: '#00174b'
  on-secondary-fixed-variant: '#003ea8'
  tertiary-fixed: '#cce5ff'
  tertiary-fixed-dim: '#93ccff'
  on-tertiary-fixed: '#001d31'
  on-tertiary-fixed-variant: '#004b73'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: 0em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.05em
  mono-data-md:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: -0.01em
  mono-data-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-lg: 1.5rem
  margin: 1rem
  margin-md: 1.5rem
  margin-lg: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
  space-2xl: 2rem
---

## Brand & Style

This design system establishes an authoritative, dependable, and high-performance administrative ecosystem tailored for higher-education governance and academic enterprise operations. The interface prioritizes institutional credibility, procedural rigor, and high-density legibility, serving academic registrars, heads of departments, faculty coordinators, and institutional leadership.

The visual style is rooted in a structured Corporate & Institutional Modernism. It emphasizes clarity over ornamentation, utilizing balanced spatial rhythm, precise horizontal hierarchy, high-contrast data tables, and unmistakable status demarcations. The interface evokes administrative confidence, absolute audit readiness, and computational accuracy—eliminating cognitive fatigue during large-scale student record audits and regulatory compliance processing.

## Colors

The color palette centers on a deep institutional navy (`#1E3A8A`) and crisp administrative slate blue (`#2563EB`), establishing a serious, scholarly foundation. Neutral surfaces utilize clean architectural slates (`#F8FAFC` foundation, `#FFFFFF` containers, `#E2E8F0` structural borders, and `#0F172A` text), maximizing contrast across dense data grids.

### Status & Compliance Semantics
Strict, universally accessible status indicators enforce compliance thresholds across student attendance calculations:
- **Regular Compliance (>= 75%):** Emerald (`#10B981` primary, `#ECFDF5` surface background, `#047857` deep border/text). Denotes uninhibited exam clearance and standard academic standing.
- **Condonation Bracket (65% - 74.9%):** Amber (`#F59E0B` primary, `#FFFBEB` surface background, `#B45309` deep border/text). Signals fee penalty requirements, medical review protocols, and formal administrative sign-off.
- **Defaulter / Detained (< 65%):** Crimson (`#EF4444` primary, `#FEF2F2` surface background, `#B91C1C` deep border/text). Strictly flags hall ticket withholding, academic review hearings, and formal parent notification lists.

All text pairings meet WCAG AAA contrast guidelines against their respective badge fills and container backdrops.

## Typography

The typography system uses `Inter` for all structural copy, navigation, form inputs, and hierarchy labels. Its tall x-height, neutral letterforms, and robust hinting guarantee immaculate legibility across crowded screens.

For institutional registration numbers (HTNOs/USNs), subject course codes, raw period counts, and attendance percentage values, `JetBrains Mono` is deployed via the `mono-data-*` tokens. Monospaced rendering prevents optical jitter during numeric sorting, vertical column scanning, and batch verification routines.

## Layout & Spacing

The interface employs a fluid, edge-to-edge 12-column administrative layout constrained to a maximum width of 1600px on ultra-wide panels. The rhythm prioritizes compact vertical margins to keep mission-critical metrics and generation buttons above the fold.

- **Desktop (>= 1280px):** 12-column system, 24px (`space-xl`) grid gutters, 32px canvas margins. Side navigation remains persistent at 260px fixed width, paired with dynamic header controls and tabular viewport expansion.
- **Tablet / Laptop (768px - 1279px):** 8-column layout, 16px (`space-lg`) gutters, collapsing sub-metrics into a condensed secondary drawer.
- **Mobile (< 768px):** Single-column stack with horizontal overflow scrolling for audit logs and student tables. Filter toolbars compress into a bottom-sheet sheet trigger.

## Elevation & Depth

To preserve administrative clarity and avoid visual noise, this design system minimizes heavy drop shadows, favoring low-contrast structural outlines and subtle tonal layering:

- **Base Layer (Canvas):** `#F8FAFC` flat surface.
- **Surface Layer (Cards, Data Panels, Table Containers):** `#FFFFFF` fill with a precise `1px solid #E2E8F0` border.
- **Raised Interactive Layer (Dropdown Menus, Popovers, Modals):** `#FFFFFF` surface, `1px solid #CBD5E1` border, backed by a clinical shadow: `0 4px 6px -1px rgba(15, 23, 42, 0.08), 0 2px 4px -2px rgba(15, 23, 42, 0.04)`.
- **Top Bar & Sticky Data Headers:** `#FFFFFF` with a bottom rule of `1px solid #CBD5E1`. When table rows scroll underneath, a subtle blur (`backdrop-filter: blur(8px)`) and a `0 2px 4px rgba(15, 23, 42, 0.03)` anchor is applied to maintain context.

## Shapes

The design system standardizes on a conservative, soft geometric shape language (`roundedness: 1`). 
- Default elements (input fields, buttons, table rows, and badges) take a `4px` (`0.25rem`) corner radius.
- Cards, summary panels, and modal containers use an `8px` (`0.5rem`) corner radius.
- System tabs, pill chips, and percentage progress tracks utilize `4px` to maintain a sharp, utilitarian software feel. Completely circular or pill elements are reserved strictly for circular profile avatars and binary toggle switches.

## Components

### Buttons
- **Primary Action (e.g., "Generate Defaulter List", "Export to PDF/Excel"):** `#1E3A8A` solid background, `#FFFFFF` bold text, `4px` radius, hover state `#172554`, active state `#0F172A`. High contrast, zero gradient.
- **Secondary (e.g., "Save Draft", "Clear Filters"):** White background, `1px solid #CBD5E1` border, `#1E3A8A` text, hover state `#F1F5F9`.
- **Destructive (e.g., "Confirm Detention", "Disqualify Hall Ticket"):** `#EF4444` background, `#FFFFFF` text, hover state `#DC2626`.

### Data Tables (High-Density Defaulter Grid)
- **Header:** `#F1F5F9` background, `#475569` text uppercase, `11px` weight 700 with `0.05em` tracking. Height fixed at `40px`.
- **Rows:** Alternating subtle banding (even: `#FFFFFF`, odd: `#F8FAFC`), bottom border `1px solid #E2E8F0`. Row height fixed at `44px` for data density.
- **Defaulter Highlights:** Rows falling below the 65% threshold exhibit a left accent border: `3px solid #EF4444` and a faint hover tint `#FEF2F2`.

### Status Badges & Compliance Chips
- Compact `4px` radius, padded `2px 8px`, uppercase typography `label-sm`.
- **Regular:** `#ECFDF5` background, `#047857` text, `#A7F3D0` border.
- **Condonation:** `#FFFBEB` background, `#B45309` text, `#FDE68A` border.
- **Detained:** `#FEF2F2` background, `#B91C1C` text, `#FECACA` border.

### Tabbed Role & Session Switches
- Segmented control format placed within a `#F1F5F9` tray. Active tab is `#FFFFFF` with `1px solid #CBD5E1` and subtle text weight shift (`600` weight) in `#1E3A8A`. Inactive tabs render in `#64748B`.

### Form Controls & Multi-Select Dropdowns
- Height `38px`, padding `0 12px`, border `1px solid #CBD5E1`, background `#FFFFFF`. Focus ring: `2px solid #2563EB` with `0px` outline offset.

### Metric Summary Cards
- Positioned above the master table. Displaying count summaries (Total Enrolled, Safe, Under Review, Defaulters). Houses a top accent border (3px) color-coded to each compliance category.