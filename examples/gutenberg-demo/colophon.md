# Colophon

This release is a demo for **Gutenberg**, a publishing toolchain that records
each edition on the Solana registry and stores its files on Arweave through
Irys, with native Arweave gateways acting as mirrors.

## About this edition

- **Edition:** Letters on Permanence, v1.0
- **Pieces:** three short letters and one front-matter page
- **Asset:** one SVG fleuron (`assets/press.svg`)
- **License:** CC BY 4.0

## Sources and further reading

- *The Coming of the Book* — Lucien Febvre & Henri-Jean Martin, 1958
- *The Nature of the Book* — Adrian Johns, 1998
- *The Book in the Renaissance* — Andrew Pettegree, 2010

The historical anecdotes in these letters are factually grounded but freely
told. Specific quotations and dates should be checked against primary sources
before citation in formal work.

## Notes on this demo

The point of opening this release through the Gutenberg gateway is not to read
the letters — they are short, and you could read them anywhere. The point is
that you can verify, locally, that:

1. the manifest you received was signed by the publisher's key;
2. its hash matches the one recorded on the Solana registry; and
3. every file you opened hashes to the value the manifest committed to.

If any of those checks fails, the gateway tells you. If the canonical host
disappears, the gateway falls back to a mirror. The text of these letters is
the same either way.

[← Back to index](index.md)
