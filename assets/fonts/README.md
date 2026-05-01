# Font Assets

This project uses a PDF-inspired visual style for Flight Group Alpha tools.

Place licensed font files in `assets/fonts/vendor/` using the filenames listed in
`font-manifest.json`. The CSS in `fonts.css` already points to those filenames.

## Licensing Notes

- Do not commit proprietary font files unless you have a license that allows
  redistribution in this repository.
- The Eurostile, Kimberley, Bank Gothic, Calibri, Arial, Agency FB, Eras ITC,
  Wingdings, and similar commercial/system fonts should be supplied locally by
  the project owner when needed.
- `xwing-miniatures` is available from the open-source
  `geordanr/xwing-miniatures-font` project and can also be installed later as an
  npm package when the web app is scaffolded.

## Expected Local Font Files

See `font-manifest.json` for the full list. The current expected directory shape:

```text
assets/
  fonts/
    fonts.css
    font-manifest.json
    vendor/
      KimberleyBl-Regular.woff2
      BankGothicBT-Medium.woff2
      EurostileLT.woff2
      EurostileLT-Bold.woff2
      Calibri.woff2
      ArialMT.woff2
      xwing-miniatures.woff2
      x-wing-ships.woff2
      Calibri-Italic.woff2
      AgencyFB-Reg.woff2
      dPolyBlockDice.woff2
      ErasITC-Medium.woff2
      Wingdings-Regular.woff2
```
