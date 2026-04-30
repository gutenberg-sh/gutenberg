use anchor_lang::prelude::*;
use anchor_lang::solana_program::program_error::ProgramError;
use anchor_lang::solana_program::system_program;
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

    pub fn publish_release(
        ctx: Context<PublishRelease>,
        site_name: String,
        site_version: String,
        manifest_uri: String,
        manifest_hash: [u8; 32],
        created_at_unix: i64,
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
            name_authority.release_count = 1;
        } else {
            require!(
                name_authority.authority == publisher_key,
                GutenbergError::NameAlreadyClaimed
            );
            name_authority.release_count = name_authority
                .release_count
                .checked_add(1)
                .ok_or(GutenbergError::ReleaseCountOverflow)?;
        }

        let name_authority_release_count = name_authority.release_count;

        let release = &mut ctx.accounts.release;
        release.publisher = publisher_key;
        release.name = site_name;
        release.version = site_version;
        release.manifest_uri = manifest_uri;
        release.manifest_hash = manifest_hash;
        release.created_at_unix = created_at_unix;

        emit!(ReleasePublished {
            publisher: publisher_key,
            release: release_pda,
            name_authority: name_authority_pda,
            name: release.name.clone(),
            version: release.version.clone(),
            manifest_uri: release.manifest_uri.clone(),
            manifest_hash: release.manifest_hash,
            created_at_unix: release.created_at_unix,
            name_authority_release_count,
        });

        Ok(())
    }

    pub fn unpublish_release(
        ctx: Context<UnpublishRelease>,
        site_name: String,
        site_version: String,
        name_seed: [u8; 32],
        version_seed: [u8; 32],
    ) -> Result<()> {
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

        require!(
            ctx.accounts.release.publisher == publisher_key,
            GutenbergError::UnauthorizedUnpublish
        );

        let na_ai = ctx.accounts.name_authority.to_account_info();
        let mut na_data = na_ai.try_borrow_mut_data()?;
        let mut cursor: &[u8] = &na_data;
        let mut na = NameAuthority::try_deserialize(&mut cursor)?;

        require!(
            na.authority == publisher_key,
            GutenbergError::UnauthorizedUnpublish
        );

        na.release_count = na
            .release_count
            .checked_sub(1)
            .ok_or(GutenbergError::ReleaseCountUnderflow)?;

        let name_authority_release_count = na.release_count;
        let close_name_authority = name_authority_release_count == 0;

        if close_name_authority {
            drop(na_data);

            let publisher_ai = ctx.accounts.publisher.to_account_info();
            let dest_lamports = publisher_ai.lamports();
            let src_lamports = na_ai.lamports();
            **publisher_ai.try_borrow_mut_lamports()? = dest_lamports
                .checked_add(src_lamports)
                .ok_or(ProgramError::ArithmeticOverflow)?;
            **na_ai.try_borrow_mut_lamports()? = 0;
            na_ai.assign(&system_program::ID);
            na_ai.resize(0)?;
        } else {
            na.try_serialize(&mut &mut na_data[..])?;
        }

        emit!(ReleaseUnpublished {
            publisher: publisher_key,
            release: release_pda,
            name_authority: name_authority_pda,
            name: site_name,
            version: site_version,
            name_authority_release_count,
            name_authority_closed: close_name_authority,
        });

        Ok(())
    }
}
