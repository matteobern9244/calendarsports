---
applyTo: "**/*.md,.env.example,package.json,.github/workflows/*.yml"
---

# Istruzioni Documentazione

- Rispetta `markdownlint` per ogni file Markdown creato o modificato.
- Mantieni `README.md` coerente con stack reale, fonti dati effettive,
  policy Git e rischio GitHub <-> Lovable.
- Non introdurre testo che incentivi push diretti o automatici su `main`.
- Non descrivere come automatico un deploy che nel repository risulta manuale.
- Non dichiarare fonti live quando il codice usa scraping, fallback o dataset statici.
- Non cambiare workflow CI, guardrail su `main` o branch policy senza
  richiesta esplicita.
- Se aggiorni `package.json`, mantieni gli script allineati a quanto e'
  realmente supportato dal repository.
