use anchor_lang::prelude::*;

#[error_code]
pub enum GutenbergError {
    #[msg("Release name is too long")]
    NameTooLong,
    #[msg("Release version is too long")]
    VersionTooLong,
    #[msg("Manifest URI is too long")]
    ManifestUriTooLong,
    #[msg("Seed hash does not match instruction data")]
    InvalidSeedHash,
    #[msg("This release name is already claimed by another publisher")]
    NameAlreadyClaimed,
}
