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

declare_id!("gut2vkAAtjGsxj3VDkFcRCB1HbwTd6VN2u6wZMno6Wt");

#[program]
pub mod gutenberg_registry {
    use super::*;

    #[allow(clippy::too_many_arguments)]
    pub fn publish_release(
        ctx: Context<PublishRelease>,
        registry_id: String,
        version: String,
        manifest_uri: String,
        manifest_hash: [u8; 32],
        content_hash: [u8; 32],
        content_size_bytes: u64,
        registry_id_seed: [u8; 32],
        version_seed: [u8; 32],
    ) -> Result<()> {
        require!(
            registry_id.len() <= Release::MAX_REGISTRY_ID_LEN,
            GutenbergError::RegistryIdTooLong
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
            hashv(&[registry_id.as_bytes()]).to_bytes() == registry_id_seed,
            GutenbergError::InvalidSeedHash
        );
        require!(
            hashv(&[version.as_bytes()]).to_bytes() == version_seed,
            GutenbergError::InvalidSeedHash
        );

        let publisher_key = ctx.accounts.publisher.key();
        let release_address = ctx.accounts.release.key();
        let publication_address = ctx.accounts.publication.key();

        let publication_account = &mut ctx.accounts.publication;

        if publication_account.owner == Pubkey::default() {
            publication_account.owner = publisher_key;
        } else {
            require!(
                publication_account.owner == publisher_key,
                GutenbergError::RegistryIdAlreadyClaimed
            );
        }

        let clock = Clock::get()?;
        let release = &mut ctx.accounts.release;
        release.schema_version = Release::CURRENT_SCHEMA_VERSION;
        release.publisher = publisher_key;
        release.registry_id = registry_id;
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
            publication_address,
            schema_version: release.schema_version,
            registry_id: release.registry_id.clone(),
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
