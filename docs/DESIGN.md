
# PulseWatch — Design System & UI/UX Guidelines

**Version:** 1.0  
**Status:** Approved  
**Product:** PulseWatch  
**Design Direction:** Premium SaaS / Luxury Minimalism  
**Primary Theme:** Obsidian & Champagne

---

# 1. Design Vision

## 1.1 Product Identity

PulseWatch is a premium uptime monitoring and incident management platform for developers, engineering teams, and businesses.

The interface must communicate:

- Reliability
- Technical precision
- Professionalism
- Clarity
- Trust
- Sophistication

The product should feel like a polished, premium developer tool rather than a generic SaaS dashboard.

## 1.2 Design Philosophy

Use a visual direction inspired by premium software products and minimalist editorial design.

Core principles:

1. Minimalism over decoration.
2. Clarity over visual complexity.
3. Typography over excessive graphical elements.
4. Subtle accents over saturated colors.
5. Consistency across every page.
6. Meaningful animations rather than decorative motion.
7. Data visualization that prioritizes readability.

## 1.3 Visual Direction

**Theme name:** Obsidian & Champagne

Primary characteristics:

- Deep charcoal backgrounds.
- Warm ivory typography.
- Muted champagne primary accents.
- Brushed bronze secondary accents.
- Subtle borders.
- Restrained shadows.
- Monochrome icons.
- Clean data visualization.
- Generous spacing.

### Strictly Avoid

- Purple and violet themes.
- Electric blue accents.
- Bright green accents.
- Supabase colors.
- Excessive gradients.
- Glassmorphism everywhere.
- Excessively rounded cards.
- Heavy shadows.
- Unnecessary animations.
- Generic AI-generated dashboard aesthetics.

---

# 2. Brand Identity

## 2.1 Brand Name

PulseWatch

## 2.2 Brand Concept

The brand represents continuous monitoring, reliability, and awareness.

Visual identity should subtly communicate:

- Pulse: Continuous monitoring.
- Watch: Observation and protection.
- Reliability: Consistent infrastructure visibility.

## 2.3 Logo Direction

Use a minimal wordmark with a simple pulse-inspired symbol.

Requirements:

- Minimal geometric icon.
- Clean typography.
- Champagne accent on dark backgrounds.
- Monochrome version for compact spaces.
- No complicated gradients or decorative illustrations.

The logo must work in:

- Sidebar.
- Login screen.
- Browser favicon.
- Marketing website.
- Application loading screen.

---

# 3. Color System

## 3.1 Primary Theme: Obsidian & Champagne

The application uses a dark-first design system.

### Core Colors

| Token | Color | Hex |
|---|---|---|
| Background | Obsidian | #101112 |
| Sidebar | Deep Charcoal | #151617 |
| Card | Graphite | #1B1C1E |
| Elevated Surface | Dark Graphite | #222326 |
| Primary Accent | Champagne | #D6BD91 |
| Secondary Accent | Bronze | #A8895D |
| Primary Text | Warm Ivory | #F4F1EA |
| Secondary Text | Stone Grey | #A5A29B |
| Muted Text | Ash Grey | #77756F |
| Border | Warm Charcoal | #30302E |

### Usage Rules

- Background: Main application canvas.
- Sidebar: Navigation container.
- Card: Dashboard cards, tables, and content surfaces.
- Elevated Surface: Dialogs, dropdowns, and popovers.
- Champagne: Primary buttons, selected navigation, focus indicators, and important highlights.
- Bronze: Secondary decorative emphasis.
- Warm Ivory: Primary text.
- Stone Grey: Supporting information.
- Border: Dividers, inputs, and card outlines.

Champagne should be used sparingly. It is an accent, not a replacement for the primary text color.

## 3.2 Semantic Status Colors

Monitoring status colors must be restrained and distinguishable.

| Status | Color | Hex |
|---|---|---|
| Operational | Soft Ivory | #D5D0C5 |
| Down | Muted Vermilion | #CF7168 |
| Recovering | Muted Amber | #D2A45F |
| Unknown | Stone Grey | #85847F |
| Paused | Dark Silver | #777777 |
| Informational | Neutral Warm Grey | #A5A29B |

### Status Design Rules

- Do not use bright green for operational status.
- Do not use electric blue for informational states.
- Do not communicate status using color alone.
- Always include a text label or recognizable icon.
- Use muted background fills for status badges.
- Keep status indicators consistent across tables, charts, and incident views.

## 3.3 Light Theme

A light theme may be introduced as an optional theme.

Suggested palette:

| Token | Hex |
|---|---|
| Background | #F5F3EE |
| Sidebar | #EEECE6 |
| Card | #FFFFFF |
| Elevated Surface | #FFFFFF |
| Primary Accent | #9B8055 |
| Secondary Accent | #806744 |
| Primary Text | #242320 |
| Secondary Text | #6F6C64 |
| Muted Text | #969188 |
| Border | #E4E0D7 |

Light theme must preserve the same visual identity.

Do not introduce a separate purple, blue, or green color system.

---

# 4. Typography

## 4.1 Font Family

Preferred fonts:

- Primary: Geist Sans.
- Alternative: Inter.
- Monospace: Geist Mono.
- Alternative monospace: JetBrains Mono.

## 4.2 Typography Scale

| Element | Size | Weight |
|---|---:|---|
| Page Title | 28–32px | 600 |
| Section Title | 20–24px | 600 |
| Card Title | 15–16px | 600 |
| Body | 14px | 400 |
| Supporting Text | 13px | 400 |
| Caption | 12px | 400 |
| Button | 13–14px | 500 |
| Metric Value | 28–36px | 600 |
| Monospace Data | 12–13px | 400 |

## 4.3 Typography Rules

- Use consistent font weights.
- Avoid excessive bold text.
- Use tabular numbers for uptime and metrics.
- Use monospace for URLs, HTTP status codes, and technical identifiers.
- Maintain readable contrast.
- Avoid unnecessarily small text.

---

# 5. Layout System

## 5.1 Application Shell

Use a persistent sidebar and a main content area.

### Desktop Layout

Sidebar:
- Expanded width: 240px.
- Collapsed width: 64px.
- Fixed or sticky positioning.
- Independent scrolling when necessary.

Main Content:
- Flexible width.
- Maximum content width: 1600px.
- Consistent horizontal padding.
- Responsive grid layout.

### Application Structure

```text
┌────────────────────────────────────────────────────────────┐
│ Sidebar       │ Header                                     │
│               ├────────────────────────────────────────────┤
│               │                                            │
│ Navigation    │ Main Content                               │
│               │                                            │
│               │                                            │
│               │                                            │
│               │                                            │
└───────────────┴────────────────────────────────────────────┘
```

## 5.2 Sidebar Navigation

Primary navigation:

1. Overview
2. Monitors
3. Incidents
4. Notifications
5. Settings

Future navigation:

- Status Pages
- Team Management
- Billing

Future features must not appear as functional navigation destinations until implemented.

### Sidebar Rules

- Use monochrome icons.
- Highlight the active navigation item using a subtle champagne-tinted surface.
- Use champagne for the active icon or indicator.
- Avoid bright navigation backgrounds.
- Keep labels readable.
- Support collapsed navigation with tooltips.

## 5.3 Header

The header may contain:

- Breadcrumbs.
- Page context.
- Search.
- Notifications.
- User profile.
- Theme selector.

Avoid unnecessary header elements.

---

# 6. Spacing and Sizing

Use a 4px spacing system.

| Token | Value |
|---|---:|
| xs | 4px |
| sm | 8px |
| md | 12px |
| lg | 16px |
| xl | 20px |
| 2xl | 24px |
| 3xl | 32px |
| 4xl | 40px |
| 5xl | 48px |
| 6xl | 64px |

### Component Spacing

- Card padding: 20–24px.
- Page section spacing: 28–32px.
- Form field spacing: 16–20px.
- Button horizontal padding: 14–18px.
- Table cell padding: 12–16px.
- Dialog padding: 24px.

### Border Radius

| Component | Radius |
|---|---:|
| Buttons | 8px |
| Inputs | 8px |
| Cards | 12px |
| Dialogs | 14px |
| Badges | 6px |
| Dropdowns | 10px |

Avoid making every component excessively rounded.

---

# 7. Component Design

Use shadcn/ui as the foundational component library.

Customize its theme and components to match the PulseWatch design system.

## 7.1 Buttons

### Primary Button

- Champagne background.
- Dark foreground.
- Medium font weight.
- Subtle hover transition.

### Secondary Button

- Graphite background.
- Ivory foreground.
- Subtle border.

### Ghost Button

- Transparent background.
- Muted foreground.
- Subtle hover surface.

### Destructive Button

- Muted vermilion background or outline.
- Clear destructive action label.

Button states:

- Default.
- Hover.
- Focus.
- Active.
- Disabled.
- Loading.

Avoid oversized buttons and unnecessary gradients.

## 7.2 Cards

Cards should use:

- Graphite background.
- Subtle warm border.
- 12px radius.
- 20–24px padding.
- Minimal shadow.

Cards should establish hierarchy through spacing and typography rather than excessive decoration.

## 7.3 Inputs

Input requirements:

- Dark graphite surface.
- Subtle border.
- Ivory text.
- Muted placeholder.
- Champagne focus ring.
- Clear validation feedback.

All forms must have:

- Labels.
- Helpful descriptions where needed.
- Validation messages.
- Disabled states.
- Loading states.

## 7.4 Tables

Tables should prioritize readability.

Requirements:

- Clear column headers.
- Consistent row height.
- Subtle horizontal dividers.
- Row hover state.
- Responsive overflow handling.
- Pagination where necessary.
- Empty and loading states.

Do not use excessive borders around every cell.

## 7.5 Badges

Use muted backgrounds and restrained text colors.

Examples:

- Operational
- Down
- Recovering
- Unknown
- Paused
- Resolved

Badges must remain readable and must not rely exclusively on color.

## 7.6 Dialogs and Dropdowns

- Elevated graphite surfaces.
- Subtle borders.
- Consistent spacing.
- Clear titles and descriptions.
- Accessible keyboard interaction.
- Appropriate focus management.

---

# 8. Dashboard Design

The dashboard is the primary landing page after authentication.

## 8.1 Dashboard Structure

Recommended order:

1. Page heading.
2. Monitoring overview metrics.
3. Uptime overview.
4. Response time chart.
5. Monitor list.
6. Recent incidents.

## 8.2 Overview Metrics

Display:

- Total Monitors.
- Operational Monitors.
- Down Monitors.
- Active Incidents.

Each metric card should include:

- Metric label.
- Metric value.
- Optional supporting context.
- Minimal icon, if useful.

Do not invent metrics or display hardcoded production values.

When data is unavailable, display an appropriate empty or unavailable state.

Do not display 100% uptime when no monitoring data exists.

## 8.3 Uptime Chart

Requirements:

- Clean line chart.
- Minimal grid lines.
- Champagne as the primary data series.
- Muted axes and labels.
- Responsive sizing.
- Tooltip with timestamp and uptime.
- Accessible text summary.

Avoid colorful gradients and unnecessary chart decorations.

## 8.4 Response Time Chart

Display:

- Average response time.
- Minimum response time.
- Maximum response time.
- Historical response time.

Use consistent neutral chart styling.

Response time units must be clearly displayed in milliseconds.

## 8.5 Monitor Overview

Suggested columns:

| Column | Description |
|---|---|
| Monitor | Monitor name |
| Endpoint | Target URL |
| Status | Current state |
| Uptime | Availability |
| Response Time | Latest latency |
| Last Checked | Most recent check |
| Actions | Monitor actions |

Use monospace typography for endpoint URLs.

---

# 9. Monitor Management UI

## 9.1 Monitor List Page

Features:

- Monitor listing.
- Search.
- Status filtering.
- Sorting.
- Pagination.
- Create monitor action.
- Empty state.

## 9.2 Create Monitor Form

Fields:

- Monitor Name.
- Target URL.
- HTTP Method.
- Check Interval.
- Request Timeout.
- Expected HTTP Status Code.

Default values should match the backend API specification.

Validation must happen on both frontend and backend.

Display clear validation errors.

Do not execute monitoring checks directly from the frontend.

## 9.3 Monitor Details Page

Display:

- Monitor name.
- Target URL.
- Current status.
- Uptime percentage.
- Latest response time.
- Historical response time.
- Check history.
- Related incidents.
- Configuration details.

Actions:

- Edit.
- Pause.
- Resume.
- Delete.

Destructive actions require confirmation.

---

# 10. Incident Management UI

## 10.1 Incident List

Display:

- Incident title.
- Affected monitor.
- Current status.
- Started time.
- Duration.
- Last updated time.

## 10.2 Incident Details

Display:

- Incident summary.
- Affected monitor.
- Incident status.
- Timeline of events.
- Failure information.
- Recovery information.
- Notification delivery history where available.

## 10.3 Incident States

Use the following states:

- OPEN
- RECOVERING
- RESOLVED

### Visual Treatment

OPEN:
- Muted vermilion indicator.

RECOVERING:
- Muted amber indicator.

RESOLVED:
- Soft neutral indicator.

Incident state must be communicated using text, not color alone.

---

# 11. Notification UI

Notification settings should be simple and secure.

MVP:

- Email notification channels.

Future:

- Slack notifications.
- Additional integrations.

Requirements:

- Create notification channel.
- Edit channel.
- Delete channel.
- Enable or disable channel.
- View delivery history.
- Display delivery failures.

Security rules:

- Never display stored secrets in plaintext.
- Never prepopulate secret fields with existing credentials.
- Mask sensitive values.
- Validate configuration before saving.
- Provide clear success and failure feedback.

---

# 12. Loading, Empty, and Error States

Every major page must handle the following states.

## 12.1 Loading

Use:

- Skeleton loaders.
- Stable layout dimensions.
- Minimal loading indicators.

Avoid full-page spinners when only one section is loading.

## 12.2 Empty

Examples:

No monitors:

"You're not monitoring anything yet."

Action:

"Create your first monitor"

No incidents:

"No incidents have been recorded."

No monitoring history:

"Monitoring data will appear after the first successful check."

Never fabricate sample production data.

## 12.3 Error

Display:

- Clear error message.
- Context where appropriate.
- Retry action when safe.
- Appropriate fallback UI.

Do not expose stack traces or internal implementation details.

## 12.4 Success

Use subtle toast notifications for:

- Monitor created.
- Monitor updated.
- Monitor paused.
- Monitor resumed.
- Notification channel created.
- Settings updated.

---

# 13. Interaction and Animation

Animations should improve usability rather than decorate the interface.

Recommended:

- Button hover transitions.
- Dropdown transitions.
- Dialog fade and scale.
- Sidebar collapse animation.
- Subtle skeleton loading.
- Chart transitions where useful.

Timing:

- Small interactions: 120–180ms.
- Dialog transitions: 160–220ms.
- Larger layout transitions: 200–250ms.

Avoid:

- Excessive bouncing.
- Flashing elements.
- Continuous decorative animations.
- Large animated backgrounds.
- Unnecessary parallax.

Respect `prefers-reduced-motion`.

---

# 14. Responsive Design

Support:

| Breakpoint | Width | Layout |
|---|---:|---|
| Mobile | <640px | Single column |
| Tablet | 640–1023px | Compact navigation |
| Desktop | 1024–1279px | Standard dashboard |
| Wide Desktop | >=1280px | Full dashboard |

## 14.1 Mobile

- Replace desktop sidebar with a drawer or compact navigation.
- Stack metric cards.
- Make charts responsive.
- Use mobile-friendly forms.
- Avoid horizontal overflow.
- Convert wide tables into responsive rows or cards.
- Keep important monitor status visible.

## 14.2 Tablet

- Use compact navigation.
- Reduce grid columns.
- Preserve readable tables.
- Avoid overly dense dashboards.

## 14.3 Desktop

- Use full sidebar.
- Use multi-column metric cards.
- Keep charts and tables aligned.
- Maintain consistent page spacing.

---

# 15. Accessibility

Target: WCAG 2.2 AA.

Requirements:

- Keyboard navigation.
- Visible focus indicators.
- Semantic HTML.
- Accessible form labels.
- Appropriate ARIA attributes.
- Sufficient text contrast.
- Screen-reader-friendly status labels.
- Accessible chart summaries.
- Reduced motion support.
- Dialog focus management.

Status must never be communicated through color alone.

All interactive components must support keyboard operation.

---

# 16. Frontend Technology

Use the following stack:

| Technology | Responsibility |
|---|---|
| Next.js | Application framework |
| React | UI rendering |
| TypeScript | Type safety |
| Tailwind CSS | Styling |
| shadcn/ui | UI primitives |
| Recharts | Data visualization |
| React Hook Form | Form management |
| Zod | Validation |
| TanStack Query | Server state |
| Lucide React | Icons |

Use the versions and configuration established in the project dependency files.

## 16.1 Component Architecture

Keep reusable components separate from feature-specific components.

Recommended structure:

```text
apps/web/src/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/
│   │   ├── overview/
│   │   ├── monitors/
│   │   ├── incidents/
│   │   ├── notifications/
│   │   └── settings/
│   ├── layout.tsx
│   └── globals.css
│
├── components/
│   ├── ui/
│   ├── layout/
│   ├── charts/
│   ├── tables/
│   └── feedback/
│
├── features/
│   ├── auth/
│   ├── dashboard/
│   ├── monitors/
│   ├── incidents/
│   ├── notifications/
│   └── settings/
│
├── hooks/
├── lib/
├── providers/
└── types/
```

## 16.2 Component Rules

- Prefer small, reusable components.
- Avoid giant page components.
- Keep business logic outside presentation components.
- Use typed component props.
- Reuse shared form components.
- Centralize API communication.
- Avoid unnecessary client components.
- Avoid duplicating design tokens.
- Keep loading and error handling consistent.

---

# 17. Design Tokens and CSS Variables

Use centralized CSS variables.

Do not hardcode colors throughout components.

Initial dark theme tokens:

```css
:root {
  color-scheme: dark;

  --background: #101112;
  --foreground: #F4F1EA;

  --card: #1B1C1E;
  --card-foreground: #F4F1EA;

  --popover: #222326;
  --popover-foreground: #F4F1EA;

  --primary: #D6BD91;
  --primary-foreground: #171614;

  --secondary: #292825;
  --secondary-foreground: #E7E1D5;

  --muted: #242423;
  --muted-foreground: #A5A29B;

  --accent: #A8895D;
  --accent-foreground: #F4F1EA;

  --destructive: #CF7168;
  --destructive-foreground: #FFFFFF;

  --border: #30302E;
  --input: #30302E;
  --ring: #D6BD91;

  --status-operational: #D5D0C5;
  --status-down: #CF7168;
  --status-recovering: #D2A45F;
  --status-unknown: #85847F;
  --status-paused: #777777;

  --radius: 0.65rem;
}
```

Adapt these variables to the installed shadcn/ui and Tailwind CSS versions.

Do not duplicate token definitions across multiple stylesheets.

---

# 18. Data Visualization Guidelines

Charts are important because PulseWatch is a monitoring product.

Requirements:

- Use Recharts.
- Keep chart styling consistent.
- Prefer neutral chart surfaces.
- Use champagne for primary chart emphasis.
- Use muted vermilion for failures.
- Use muted amber for recovery-related events.
- Keep axes subtle.
- Provide readable tooltips.
- Display units.
- Support responsive layouts.
- Provide text alternatives or summaries.

Never present missing monitoring data as successful monitoring data.

Chart data must come from actual backend responses.

---

# 19. Performance Guidelines

Frontend performance is part of the user experience.

Requirements:

- Use server components where appropriate.
- Avoid unnecessary client-side rendering.
- Lazy-load expensive charts when appropriate.
- Avoid unnecessary re-renders.
- Use pagination for large datasets.
- Cache server data appropriately.
- Use skeletons for loading states.
- Avoid polling inactive pages unnecessarily.
- Clean up subscriptions and timers.
- Avoid large unnecessary dependencies.

Suggested dashboard polling:

- Overview metrics: 30 seconds.
- Monitor status: 15–30 seconds.
- Incident updates: 15–30 seconds.

Polling intervals must be configurable and should reduce when the page is inactive.

Do not use frontend polling as a replacement for the backend monitoring scheduler.

---

# 20. UX and Product Behavior

## 20.1 Feedback

Every user action must provide appropriate feedback.

Examples:

- Save operations show success or failure.
- Destructive operations require confirmation.
- Long-running actions show progress.
- Invalid forms show field-level errors.

## 20.2 Optimistic Updates

Optimistic updates may be used for low-risk preferences.

Do not optimistically report:

- Monitor operational status.
- Incident resolution.
- Uptime percentage.
- Monitoring check results.

These values must reflect authoritative backend data.

## 20.3 Data Integrity

- Never fabricate monitoring results.
- Never show fake uptime percentages.
- Never show fake incident counts.
- Display unavailable states when data is missing.
- Distinguish stale data from current data.
- Show the timestamp of the latest monitoring result.

---

# 21. Development Implementation Order

Implement the UI in this order.

### Phase 1: Design Foundation

- Configure Tailwind CSS.
- Configure shadcn/ui theme.
- Implement global CSS variables.
- Configure typography.
- Implement buttons, inputs, cards, badges, dialogs, and tables.
- Build application shell.

### Phase 2: Authentication UI

- Login page.
- Registration page.
- Form validation.
- Loading and error states.

### Phase 3: Dashboard

- Overview layout.
- Metric cards.
- Uptime chart.
- Response time chart.
- Monitor overview.
- Recent incidents.

### Phase 4: Monitor Management

- Monitor list.
- Create monitor form.
- Edit monitor form.
- Monitor details.
- Check history.

### Phase 5: Incident Management

- Incident list.
- Incident details.
- Incident timeline.
- Recovery state.

### Phase 6: Notification Management

- Notification channel list.
- Create and edit channel.
- Delivery history.

### Phase 7: Polish

- Responsive design.
- Accessibility.
- Loading states.
- Empty states.
- Error states.
- Performance optimization.
- Visual consistency audit.

---

# 22. Design Quality Checklist

Before considering a page complete, verify:

## Visual Quality

- [ ] Uses the Obsidian & Champagne design system.
- [ ] No purple or violet accents.
- [ ] No electric blue accents.
- [ ] No bright green accents.
- [ ] Consistent typography.
- [ ] Consistent spacing.
- [ ] Consistent border radius.
- [ ] Subtle borders and shadows.
- [ ] No unnecessary gradients.
- [ ] No decorative visual clutter.

## Functional Quality

- [ ] All buttons work.
- [ ] Forms validate correctly.
- [ ] API integration is implemented.
- [ ] Loading states are present.
- [ ] Empty states are present.
- [ ] Error states are present.
- [ ] Destructive actions require confirmation.
- [ ] No fabricated monitoring data.

## Responsive Quality

- [ ] Mobile layout works.
- [ ] Tablet layout works.
- [ ] Desktop layout works.
- [ ] No horizontal overflow.
- [ ] Tables remain usable.
- [ ] Charts resize correctly.

## Accessibility

- [ ] Keyboard navigation works.
- [ ] Focus indicators are visible.
- [ ] Form labels are accessible.
- [ ] Status is not communicated through color alone.
- [ ] Contrast meets WCAG 2.2 AA.
- [ ] Reduced motion is respected.

---

# 23. Non-Negotiable Design Rules

1. Obsidian & Champagne is the authoritative PulseWatch visual identity.
2. Do not introduce purple, violet, electric blue, or bright green as brand accents.
3. Do not use generic dashboard templates without adapting them to this design system.
4. Do not hardcode colors inside individual components.
5. Do not fabricate dashboard metrics or monitoring history.
6. Do not display post-MVP features as functional features.
7. Do not compromise accessibility for visual appearance.
8. Maintain consistency across every authenticated page.
9. Use real backend data for monitoring information.
10. Prioritize usability and readability over visual decoration.

---

# 24. Final Design Objective

PulseWatch should look and feel like a premium infrastructure monitoring platform.

The experience should combine:

- The simplicity of modern SaaS products.
- The precision of developer tools.
- The clarity of professional monitoring dashboards.
- The elegance of a restrained luxury design system.

**Final visual identity:**

Obsidian backgrounds.  
Warm ivory typography.  
Champagne accents.  
Muted bronze details.  
Restrained status colors.  
Clean data visualization.  
Minimal, professional interactions.

The interface should be recognizable, consistent, and production-ready.
