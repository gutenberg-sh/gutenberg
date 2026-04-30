use anchor_lang::prelude::*;
use solana_sha256_hasher::hashv;

declare_id!("NRrK71RxAHpt5CdLUWgRzTuzMopnRBnEqCiCku6J517");

#[program]
pub mod gutenberg_registry {
    use super::*;

    pub fn publish_release(
        ctx: Context<PublishRelease>,
        name: String,
        version: String,
        manifest_uri: String,
        manifest_hash: String,
        created_at: String,
        name_hash: [u8; 32],
        version_hash: [u8; 32],
    ) -> Result<()> {
        require!(name.len() <= Release::MAX_NAME_LEN, GutenbergError::NameTooLong);
        require!(
            version.len() <= Release::MAX_VERSION_LEN,
            GutenbergError::VersionTooLong
        );
        require!(
            manifest_uri.len() <= Release::MAX_URI_LEN,
            GutenbergError::ManifestUriTooLong
        );
        require!(
            manifest_hash.len() <= Release::MAX_HASH_LEN,
            GutenbergError::ManifestHashTooLong
        );
        require!(
            created_at.len() <= Release::MAX_CREATED_AT_LEN,
            GutenbergError::CreatedAtTooLong
        );
        require!(
            hashv(&[name.as_bytes()]).to_bytes() == name_hash,
            GutenbergError::InvalidSeedHash
        );
        require!(
            hashv(&[version.as_bytes()]).to_bytes() == version_hash,
            GutenbergError::InvalidSeedHash
        );

        let name_authority = &mut ctx.accounts.name_authority;
        let publisher_key = ctx.accounts.publisher.key();
        if name_authority.authority == Pubkey::default() {
            name_authority.authority = publisher_key;
        } else {
            require!(
                name_authority.authority == publisher_key,
                GutenbergError::NameAlreadyClaimed
            );
        }

        let release = &mut ctx.accounts.release;
        release.publisher = ctx.accounts.publisher.key();
        release.name = name;
        release.version = version;
        release.manifest_uri = manifest_uri;
        release.manifest_hash = manifest_hash;
        release.created_at = created_at;

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(
    name: String,
    version: String,
    manifest_uri: String,
    manifest_hash: String,
    created_at: String,
    name_hash: [u8; 32],
    version_hash: [u8; 32],
)]
pub struct PublishRelease<'info> {
    #[account(mut)]
    pub publisher: Signer<'info>,

    #[account(
        init_if_needed,
        payer = publisher,
        space = NameAuthority::SPACE,
        seeds = [b"name", name_hash.as_ref()],
        bump,
    )]
    pub name_authority: Account<'info, NameAuthority>,

    #[account(
        init,
        payer = publisher,
        space = Release::SPACE,
        seeds = [
            b"release",
            publisher.key().as_ref(),
            name_hash.as_ref(),
            version_hash.as_ref(),
        ],
        bump,
    )]
    pub release: Account<'info, Release>,

    pub system_program: Program<'info, System>,
}

#[account]
pub struct NameAuthority {
    pub authority: Pubkey,
}

impl NameAuthority {
    pub const SPACE: usize = 8 + 32;
}

#[account]
pub struct Release {
    pub publisher: Pubkey,
    pub name: String,
    pub version: String,
    pub manifest_uri: String,
    pub manifest_hash: String,
    pub created_at: String,
}

impl Release {
    pub const MAX_NAME_LEN: usize = 64;
    pub const MAX_VERSION_LEN: usize = 32;
    pub const MAX_URI_LEN: usize = 512;
    pub const MAX_HASH_LEN: usize = 71;
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
        + Self::MAX_HASH_LEN
        + 4
        + Self::MAX_CREATED_AT_LEN;
}

#[error_code]
pub enum GutenbergError {
    #[msg("Release name is too long")]
    NameTooLong,
    #[msg("Release version is too long")]
    VersionTooLong,
    #[msg("Manifest URI is too long")]
    ManifestUriTooLong,
    #[msg("Manifest hash is too long")]
    ManifestHashTooLong,
    #[msg("Created-at timestamp is too long")]
    CreatedAtTooLong,
    #[msg("Seed hash does not match instruction data")]
    InvalidSeedHash,
    #[msg("This release name is already claimed by another publisher")]
    NameAlreadyClaimed,
}
