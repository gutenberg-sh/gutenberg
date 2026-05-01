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
        name: String,
        version: String,
        manifest_uri: String,
        manifest_hash: [u8; 32],
        content_hash: [u8; 32],
        content_size_bytes: u64,
        name_seed: [u8; 32],
        version_seed: [u8; 32],
    ) -> Result<()> {
        require!(
            name.len() <= Release::MAX_NAME_LEN,
            GutenbergError::NameTooLong
        );
        require!(
            version.len() <= Release::MAX_VERSION_LEN,
            GutenbergError::VersionTooLong
        );
        require!(
            manifest_uri.len() <= Release::MAX_URI_LEN,
            GutenbergError::ManifestUriTooLong
        );
        require!(
            hashv(&[name.as_bytes()]).to_bytes() == name_seed,
            GutenbergError::InvalidSeedHash
        );
        require!(
            hashv(&[version.as_bytes()]).to_bytes() == version_seed,
            GutenbergError::InvalidSeedHash
        );

        let publisher_key = ctx.accounts.publisher.key();
        let release_address = ctx.accounts.release.key();
        let name_address = ctx.accounts.name.key();

        let name_account = &mut ctx.accounts.name;

        if name_account.authority == Pubkey::default() {
            name_account.authority = publisher_key;
        } else {
            require!(
                name_account.authority == publisher_key,
                GutenbergError::NameAlreadyClaimed
            );
        }

        let clock = Clock::get()?;
        let release = &mut ctx.accounts.release;
        release.schema_version = Release::CURRENT_SCHEMA_VERSION;
        release.publisher = publisher_key;
        release.name = name;
        release.version = version;
        release.manifest_uri = manifest_uri;
        release.manifest_hash = manifest_hash;
        release.content_hash = content_hash;
        release.content_size_bytes = content_size_bytes;
        release.published_at_unix = clock.unix_timestamp;
        release.published_at_slot = clock.slot;

        emit!(ReleasePublished {
            publisher: publisher_key,
            release_address,
            name_address,
            schema_version: release.schema_version,
            name: release.name.clone(),
            version: release.version.clone(),
            manifest_uri: release.manifest_uri.clone(),
            manifest_hash: release.manifest_hash,
            content_hash: release.content_hash,
            content_size_bytes: release.content_size_bytes,
            published_at_unix: release.published_at_unix,
            published_at_slot: release.published_at_slot,
        });

        Ok(())
    }
}
