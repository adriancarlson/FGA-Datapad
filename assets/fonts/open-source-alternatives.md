# Open Source Font Alternatives

This file tracks license-safe alternatives to the fonts detected in the
Flight Group Alpha PDFs. The goal is to keep the app visually close to the
source material without requiring proprietary font redistribution.

## Recommended App Stack

Use these as the default app fonts:

| Role | Recommended font | Why |
| --- | --- | --- |
| Display / title | Orbitron or Michroma | Futuristic squared display feel suitable for mission headers. |
| Section headings | Saira Semi Condensed or Rajdhani | Technical, squared, condensed heading style. |
| Body text | Saira Condensed or Rajdhani | Readable at UI sizes while still feeling like a mission briefing. |
| Card/table labels | Rajdhani Medium/Bold | Strong Bank Gothic-like squared label shape. |
| X-Wing icons | xwing-miniatures-font | Purpose-built open-source X-Wing icon font. |
| Ship icons | xwing-miniatures-font ship font | Purpose-built open-source X-Wing ship icon font. |
| Dice icons | SVG/icon components instead of font | Easier to style, inspect, and license clearly than a mystery embedded PDF font. |

## PDF Font Substitution Map

| PDF font | Proposed open-source substitute | Notes |
| --- | --- | --- |
| KimberleyBl-Regular | Orbitron Black, Michroma, or Rajdhani Bold | Kimberley may be usable for desktop graphics, but web/app embedding can require a separate license. Prefer a true open-source substitute for the app. |
| EurostileLTStd-Bold | Saira Semi Condensed Bold or Exo Bold | Saira has many widths and weights; Exo is a strong Eurostile-like sci-fi option. |
| EurostileLTStd-DemiOblique | Saira Semi Condensed SemiBold Italic or Exo SemiBold Italic | Both have italic/oblique styles suitable for examples and formula lines. |
| EurostileLTStd-Cn | Saira Condensed Regular or Rajdhani Regular | Good body text replacements with technical proportions. |
| EurostileLTStd-Demi | Saira SemiBold or Exo SemiBold | Good for emphasis and costs. |
| EurostileLTStd-BoldCn | Saira Condensed Bold or Rajdhani Bold | Condensed emphasis replacement. |
| EurostileBQ-Regular | Rajdhani Regular or Saira Regular | Use for card text if we recreate card-like UI. |
| BankGothicBT-Medium | Rajdhani Medium/Bold | Rajdhani has squared, technical, display-oriented forms. |
| xwing-miniatures | xwing-miniatures-font | Use the open-source icon font or package. |
| x-wing-ships | xwing-miniatures-font ship font | Use the open-source ship font or package. |
| Dice | Public domain SVG dice/action icons | Prefer SVG components to avoid a custom icon font dependency. |
| EurostileBold | Saira Bold or Exo Bold | Low-confidence PDF usage; can be covered by the heading stack. |

## Font Candidates

### Saira

License: SIL Open Font License 1.1.

Best use: headings, body text, condensed UI, italic example text. It is the most
useful single family because it includes many weights, widths, and italics.

### Rajdhani

License: SIL Open Font License 1.1.

Best use: Bank Gothic-style labels, mission card headings, compact technical UI.

### Exo

License: SIL Open Font License 1.1.

Best use: Eurostile-like headings and emphasis where a more futuristic rounded
geometric voice is desirable.

### Michroma

License: SIL Open Font License 1.1.

Best use: strong display titles and occasional labels. It has a very Eurostile /
Microgramma-adjacent shape, but limited weight range compared with Saira.

### Orbitron

License: SIL Open Font License 1.1.

Best use: big display titles and dramatic mission headers. It is more overtly
sci-fi than the PDF, so use sparingly.

## Implementation Plan

When the web app is scaffolded, install fonts through npm packages or vendor
their OFL files into `assets/fonts/vendor/` with license files preserved.

Suggested default CSS variables:

```css
:root {
  --font-fga-display: "Orbitron", "Michroma", sans-serif;
  --font-fga-heading: "Saira Semi Condensed", "Rajdhani", sans-serif;
  --font-fga-body: "Saira Condensed", "Rajdhani", Arial, sans-serif;
  --font-fga-card: "Rajdhani", "Saira", sans-serif;
}
```

