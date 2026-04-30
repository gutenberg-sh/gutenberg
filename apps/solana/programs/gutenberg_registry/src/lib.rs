use anchor_lang::prelude::*;
use anchor_lang::solana_program::program_error::ProgramError;
use anchor_lang::solana_program::system_program;
use solana_sha256_hasher::hashv;

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

        let name_authority = &mut ctx.accounts.name_authority;
        let publisher_key = ctx.accounts.publisher.key();

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

        let release = &mut ctx.accounts.release;
        release.publisher = ctx.accounts.publisher.key();
        release.name = site_name;
        release.version = site_version;
        release.manifest_uri = manifest_uri;
        release.manifest_hash = manifest_hash;
        release.created_at_unix = created_at_unix;

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

        require!(
            ctx.accounts.release.publisher == ctx.accounts.publisher.key(),
            GutenbergError::UnauthorizedUnpublish
        );

        let na_ai = ctx.accounts.name_authority.to_account_info();
        let mut na_data = na_ai.try_borrow_mut_data()?;
        let mut cursor: &[u8] = &na_data;
        let mut na = NameAuthority::try_deserialize(&mut cursor)?;

        require!(
            na.authority == ctx.accounts.publisher.key(),
            GutenbergError::UnauthorizedUnpublish
        );

        na.release_count = na
            .release_count
            .checked_sub(1)
            .ok_or(GutenbergError::ReleaseCountUnderflow)?;

        let close_name_authority = na.release_count == 0;

        if close_name_authority {
            drop(na_data);
            close_account_lamports_to(&na_ai, &ctx.accounts.publisher.to_account_info())?;
        } else {
            na.try_serialize(&mut &mut na_data[..])?;
        }

        Ok(())
    }
}

fn close_account_lamports_to<'info>(
    account: &AccountInfo<'info>,
    destination: &AccountInfo<'info>,
) -> Result<()> {
    let dest = destination.lamports();
    let src = account.lamports();
    **destination.try_borrow_mut_lamports()? = dest
        .checked_add(src)
        .ok_or(ProgramError::ArithmeticOverflow)?;
    **account.try_borrow_mut_lamports()? = 0;
    account.assign(&system_program::ID);
    account.resize(0)?;
    Ok(())
}

#[derive(Accounts)]
#[instruction(
    site_name: String,
    site_version: String,
    manifest_uri: String,
    manifest_hash: [u8; 32],
    created_at_unix: i64,
    name_seed: [u8; 32],
    version_seed: [u8; 32],
)]
pub struct PublishRelease<'info> {
    #[account(mut)]
    pub publisher: Signer<'info>,

    #[account(
        init_if_needed,
        payer = publisher,
        space = NameAuthority::SPACE,
        seeds = [b"name", name_seed.as_ref()],
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
            name_seed.as_ref(),
            version_seed.as_ref(),
        ],
        bump,
    )]
    pub release: Account<'info, Release>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(
    site_name: String,
    site_version: String,
    name_seed: [u8; 32],
    version_seed: [u8; 32],
)]
pub struct UnpublishRelease<'info> {
    #[account(mut)]
    pub publisher: Signer<'info>,

    /// CHECK: PDA verified by seeds; layout deserialized as NameAuthority in unpublish_release.
    #[account(
        mut,
        seeds = [b"name", name_seed.as_ref()],
        bump,
    )]
    pub name_authority: UncheckedAccount<'info>,

    #[account(
        mut,
        close = publisher,
        seeds = [
            b"release",
            publisher.key().as_ref(),
            name_seed.as_ref(),
            version_seed.as_ref(),
        ],
        bump,
    )]
    pub release: Account<'info, Release>,

    pub system_program: Program<'info, System>,
}

#[account]
pub struct NameAuthority {
    pub authority: Pubkey,
    pub release_count: u32,
}

impl NameAuthority {
    pub const SPACE: usize = 8 + 32 + 4;
}

#[account]
pub struct Release {
    pub publisher: Pubkey,
    pub name: String,
    pub version: String,
    pub manifest_uri: String,
    pub manifest_hash: [u8; 32],
    pub created_at_unix: i64,
}

impl Release {
    pub const MAX_NAME_LEN: usize = 64;
    pub const MAX_VERSION_LEN: usize = 32;
    pub const MAX_URI_LEN: usize = 512;
    pub const SPACE: usize = 8
        + 32
        + 4
        + Self::MAX_NAME_LEN
        + 4
        + Self::MAX_VERSION_LEN
        + 4
        + Self::MAX_URI_LEN
        + 32
        + 8;
}

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
    #[msg("Release counter overflow")]
    ReleaseCountOverflow,
    #[msg("Release counter underflow")]
    ReleaseCountUnderflow,
    #[msg("Only the publisher may unpublish this release")]
    UnauthorizedUnpublish,
}
