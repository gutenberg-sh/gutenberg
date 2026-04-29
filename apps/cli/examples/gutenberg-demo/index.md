# Gutenberg Demo

This is a local demo document for publishing through Gutenberg.

It should be uploaded to S3-compatible storage, referenced by a signed manifest,
and registered on the local Solana registry.

## Notes

- The file is plain Markdown.
- The publish step should make the content immutable by hash.
- The open step should verify the manifest signature and file hash.
