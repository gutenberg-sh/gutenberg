use anchor_lang::prelude::*;
use solana_sha256_hasher::hashv;

declare_id!("BRcCBWgjBo3M9ZtzrGMzy2PmGkbNTUs9n4fiNFhoCrrz");

#[program]
pub mod veritas_registry {
    use super::*;

    pub fn publish_release(
        ctx: Context<PublishRelease>,
        name: String,
        version: String,
        manifest_uri: String,
        manifest_publisher: String,
        release_signature: String,
        created_at: String,
        manifest_publisher_hash: [u8; 32],
        name_hash: [u8; 32],
        version_hash: [u8; 32],
    ) -> Result<()> {
        require!(name.len() <= Release::MAX_NAME_LEN, VeritasError::NameTooLong);
        require!(
            version.len() <= Release::MAX_VERSION_LEN,
            VeritasError::VersionTooLong
        );
        require!(
            manifest_uri.len() <= Release::MAX_URI_LEN,
            VeritasError::ManifestUriTooLong
        );
        require!(
            manifest_publisher.len() <= Release::MAX_PUBLISHER_LEN,
            VeritasError::ManifestPublisherTooLong
        );
        require!(
            ctx.accounts.registry_authority.key().to_string() == manifest_publisher,
            VeritasError::PublisherMustSign
        );
        require!(
            release_signature.len() <= Release::MAX_SIGNATURE_LEN,
            VeritasError::ReleaseSignatureTooLong
        );
        require!(
            created_at.len() <= Release::MAX_CREATED_AT_LEN,
            VeritasError::CreatedAtTooLong
        );
        require!(
            hashv(&[manifest_publisher.as_bytes()]).to_bytes() == manifest_publisher_hash,
            VeritasError::InvalidSeedHash
        );
        require!(
            hashv(&[name.as_bytes()]).to_bytes() == name_hash,
            VeritasError::InvalidSeedHash
        );
        require!(
            hashv(&[version.as_bytes()]).to_bytes() == version_hash,
            VeritasError::InvalidSeedHash
        );

        let release = &mut ctx.accounts.release;
        release.registry_authority = ctx.accounts.registry_authority.key();
        release.name = name;
        release.version = version;
        release.manifest_uri = manifest_uri;
        release.manifest_publisher = manifest_publisher;
        release.release_signature = release_signature;
        release.created_at = created_at;

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(
    name: String,
    version: String,
    manifest_uri: String,
    manifest_publisher: String,
    release_signature: String,
    created_at: String,
    manifest_publisher_hash: [u8; 32],
    name_hash: [u8; 32],
    version_hash: [u8; 32],
)]
pub struct PublishRelease<'info> {
    #[account(mut)]
    pub registry_authority: Signer<'info>,

    #[account(
        init,
        payer = registry_authority,
        space = Release::SPACE,
        seeds = [
            b"release",
            manifest_publisher_hash.as_ref(),
            name_hash.as_ref(),
            version_hash.as_ref(),
        ],
        bump,
    )]
    pub release: Account<'info, Release>,

    pub system_program: Program<'info, System>,
}

#[account]
pub struct Release {
    pub registry_authority: Pubkey,
    pub name: String,
    pub version: String,
    pub manifest_uri: String,
    pub manifest_publisher: String,
    pub release_signature: String,
    pub created_at: String,
}

impl Release {
    pub const MAX_NAME_LEN: usize = 64;
    pub const MAX_VERSION_LEN: usize = 32;
    pub const MAX_URI_LEN: usize = 512;
    pub const MAX_PUBLISHER_LEN: usize = 128;
    pub const MAX_SIGNATURE_LEN: usize = 128;
    pub const MAX_CREATED_AT_LEN: usize = 32;
    pub const SPACE: usize = 8
        + 32
        + 4
        + Self::MAX_NAME_LEN
        + 4
        + Self::MAX_VERSION_LEN
        + 4
        + Self::MAX_URI_LEN
        + 4
        + Self::MAX_PUBLISHER_LEN
        + 4
        + Self::MAX_SIGNATURE_LEN
        + 4
        + Self::MAX_CREATED_AT_LEN;
}

#[error_code]
pub enum VeritasError {
    #[msg("Release name is too long")]
    NameTooLong,
    #[msg("Release version is too long")]
    VersionTooLong,
    #[msg("Manifest URI is too long")]
    ManifestUriTooLong,
    #[msg("Manifest publisher is too long")]
    ManifestPublisherTooLong,
    #[msg("Manifest publisher must match the transaction signer")]
    PublisherMustSign,
    #[msg("Release signature is too long")]
    ReleaseSignatureTooLong,
    #[msg("Created-at timestamp is too long")]
    CreatedAtTooLong,
    #[msg("Seed hash does not match instruction data")]
    InvalidSeedHash,
}
