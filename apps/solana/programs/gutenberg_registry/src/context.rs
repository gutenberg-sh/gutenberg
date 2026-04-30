use anchor_lang::prelude::*;

use crate::state::{NameAuthority, Release};

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
