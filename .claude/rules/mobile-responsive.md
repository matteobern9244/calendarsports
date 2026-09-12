---
description: Niente deve scorrere in orizzontale su mobile, e le fixture dei test di layout devono portare il caso peggiore vero.
globs:
  - src/pages/**
  - src/components/**
  - src/index.css
  - e2e/**
---

# Responsività e scorrimento orizzontale

Leggi [`docs/agent-playbook/verification-and-change-management.md`](../../docs/agent-playbook/verification-and-change-management.md)
prima di toccare layout, tabelle o fixture dei test.

Promemoria: **niente scorre lateralmente in mobile**, né una pagina né un
singolo componente. Le tre cause che si ripresentano sono sempre le stesse: un
elemento di griglia ha `min-width: auto` e invece di comprimersi allarga la
colonna (si sblocca con `min-w-0`, e il sintomo si vede sul documento mentre la
causa sta molti livelli più sotto); una riga di pillole va a capo con
`flex-wrap`, mai con `overflow-x-auto` più `min-w-max`; le celle di
`src/components/ui/**` sono generate e non si toccano, quindi il loro padding si
stringe da una regola in `index.css`. Quando si toglie una colonna, la soglia è
la più stretta possibile (`max-[380px]:hidden`), mai `sm`.

E una fixture più piccola del vero non è più semplice: è cieca. Un guardiano di
layout misura il layout dei dati che gli si danno, quindi le fixture portano i
nomi più lunghi della griglia, abbastanza elementi da far comparire la
paginazione e i campi facoltativi popolati.

Il controllo eseguibile è `e2e/mobile.spec.ts` (progetto Playwright `mobile`),
non questa sintesi.
