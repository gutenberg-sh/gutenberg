use anchor_lang::prelude::*;

use crate::state::{Name, Release};

#[derive(Accounts)]
#[instruction(
    name: String,
    version: String,
    manifest_uri: String,
    manifest_hash: [u8; 32],
    content_hash: [u8; 32],
    content_size_bytes: u64,
    name_seed: [u8; 32],
    version_seed: [u8; 32],
)]
pub struct PublishRelease<'info> {
    #[account(mut)]
    pub publisher: Signer<'info>,

    #[account(
        init_if_needed,
        payer = publisher,
        space = Name::SPACE,
        seeds = [b"name", name_seed.as_ref()],
        bump,
    )]
    pub name: Account<'info, Name>,

    #[account(
        init,
        payer = publisher,
        space = Release::SPACE,
        seeds = [
            b"release",
            name_seed.as_ref(),
            version_seed.as_ref(),
        ],
        bump,
    )]
    pub release: Account<'info, Release>,

    pub system_program: Program<'info, System>,
}
