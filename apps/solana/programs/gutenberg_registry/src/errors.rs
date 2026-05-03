use anchor_lang::prelude::*;

#[error_code]
pub enum GutenbergError {
    #[msg("Release registry id is too long")]
    RegistryIdTooLong,
    #[msg("Release version is too long")]
    VersionTooLong,
    #[msg("Manifest URI is too long")]
    ManifestUriTooLong,
    #[msg("Seed hash does not match instruction data")]
    InvalidSeedHash,
    #[msg("This registry id is already claimed by another publisher")]
    RegistryIdAlreadyClaimed,
}
