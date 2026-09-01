# Bandiere tonde

SVG circolari del set [circle-flags](https://github.com/HatScripts/circle-flags)
(licenza MIT), scaricati e versionati qui: nessuna dipendenza da CDN a runtime.

- Nome file = codice ISO 3166-1 alpha-2 minuscolo (`it.svg`, `gb.svg`, …).
- Si usano SEMPRE tramite il componente condiviso `src/core/components/FlagCircle.tsx`,
  mai con `<img>` sciolti: la forma tonda, l'anello e il ripiego sull'emoji
  vivono lì.
- Per aggiungere un paese: scaricare `flags/<iso>.svg` dal repo circle-flags e
  aggiungere il nome italiano nella mappa `ISO` di `src/core/utils/countryFlags.ts`.
