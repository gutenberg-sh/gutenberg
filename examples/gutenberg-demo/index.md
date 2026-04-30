# Gutenberg Demo

This is a local demo document for publishing through Gutenberg.

Each file should be uploaded individually to Arweave (via Irys), referenced by a signed manifest,
and registered on the local Solana registry.

## Notes

- The file is plain Markdown.
- The publish step should make the content immutable by hash.
- The open step should verify the manifest signature and file hash.
