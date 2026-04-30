use anchor_lang::prelude::*;
use solana_sha256_hasher::hashv;

pub mod context;
pub mod errors;
pub mod event;
pub mod state;

pub use context::*;
pub use errors::GutenbergError;
pub use event::*;
pub use state::*;

declare_id!("NRrK71RxAHpt5CdLUWgRzTuzMopnRBnEqCiCku6J517");

#[program]
pub mod gutenberg_registry {
    use super::*;

    #[allow(clippy::too_many_arguments)]
    pub fn publish_release(
        ctx: Context<PublishRelease>,
        site_name: String,
        site_version: String,
        manifest_uri: String,
        manifest_hash: [u8; 32],
        content_hash: [u8; 32],
        content_size_bytes: u64,
        name_seed: [u8; 32],
        version_seed: [u8; 32],
    ) -> Result<()> {
        require!(
            site_name.len() <= Release::MAX_NAME_LEN,
            GutenbergError::NameTooLong
        );
        require!(
            site_version.len() <= Release::MAX_VERSION_LEN,
            GutenbergError::VersionTooLong
        );
        require!(
            manifest_uri.len() <= Release::MAX_URI_LEN,
            GutenbergError::ManifestUriTooLong
        );
        require!(
            hashv(&[site_name.as_bytes()]).to_bytes() == name_seed,
            GutenbergError::InvalidSeedHash
        );
        require!(
            hashv(&[site_version.as_bytes()]).to_bytes() == version_seed,
            GutenbergError::InvalidSeedHash
        );

        let publisher_key = ctx.accounts.publisher.key();
        let release_pda = ctx.accounts.release.key();
        let name_authority_pda = ctx.accounts.name_authority.key();

        let name_authority = &mut ctx.accounts.name_authority;

        if name_authority.authority == Pubkey::default() {
            name_authority.authority = publisher_key;
        } else {
            require!(
                name_authority.authority == publisher_key,
                GutenbergError::NameAlreadyClaimed
            );
        }

        let clock = Clock::get()?;
        let release = &mut ctx.accounts.release;
        release.schema_version = Release::CURRENT_SCHEMA_VERSION;
        release.publisher = publisher_key;
        release.name = site_name;
        release.version = site_version;
        release.manifest_uri = manifest_uri;
        release.manifest_hash = manifest_hash;
        release.content_hash = content_hash;
        release.content_size_bytes = content_size_bytes;
        release.created_at_unix = clock.unix_timestamp;
        release.created_at_slot = clock.slot;

        emit!(ReleasePublished {
            publisher: publisher_key,
            release: release_pda,
            name_authority: name_authority_pda,
            schema_version: release.schema_version,
            name: release.name.clone(),
            version: release.version.clone(),
            manifest_uri: release.manifest_uri.clone(),
            manifest_hash: release.manifest_hash,
            content_hash: release.content_hash,
            content_size_bytes: release.content_size_bytes,
            created_at_unix: release.created_at_unix,
            created_at_slot: release.created_at_slot,
        });

        Ok(())
    }
}
