# SMART → Borda Decision Support — Demo

ini adalah project kecil yang menjalankan kalkulasi metode smart dan Borda count kepada setiap juri ke setiap alternatif
Project layout (organized):

- index.html        — main entry (open in browser)
- css/styles.css    — styles
- js/script.js      — application logic

How to run

- Open `index.html` in your browser. No build step required.

Notes & suggestions

- The judge editor is generated dynamically in a popup (the editor HTML still includes small inline styles/scripts because it's produced as a string).
- For production, consider:
  - Adding basic tests and CI.
  - Bundling/minifying assets.
  - Serving via a tiny dev server (e.g., `npx http-server` or `python -m http.server`).

Contributor: reorganized by automated assistant.