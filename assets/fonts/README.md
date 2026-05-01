# Font Assets

FGA Datapad uses a PDF-inspired visual style for Flight Group Alpha.

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

See `font-manifest.json` for the full list. The current local development
directory shape:

```text
assets/
  fonts/
    fonts.css
    font-manifest.json
    vendor/
      KimberleyBl-Regular.ttf
      BankGothic-Light.otf
      BankGothicBT-Medium.ttf
      BankGothicBT-Bold.ttf
      EurostileLTStd-Cn.otf
      EurostileLTStd-Demi.otf
      EurostileLTStd-DemiOblique.ttf
      EurostileLTStd-Bold.otf
      EurostileLTStd-BoldCn.otf
      EurostileLTStd-Ex2.otf
      MyriadPro-Regular.otf
      xwing-miniatures.ttf
      xwing-miniatures-ships.ttf
```
