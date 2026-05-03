use anchor_lang::prelude::*;

use crate::state::{Publication, Release};

#[derive(Accounts)]
#[instruction(
    registry_id: String,
    version: String,
    manifest_uri: String,
    manifest_hash: [u8; 32],
    content_hash: [u8; 32],
    content_size_bytes: u64,
    registry_id_seed: [u8; 32],
    version_seed: [u8; 32],
)]
pub struct PublishRelease<'info> {
    #[account(mut)]
    pub publisher: Signer<'info>,

    #[account(
        init_if_needed,
        payer = publisher,
        space = Publication::SPACE,
        seeds = [b"publication", registry_id_seed.as_ref()],
        bump,
    )]
    pub publication: Account<'info, Publication>,

    #[account(
        init,
        payer = publisher,
        space = Release::SPACE,
        seeds = [
            b"release",
            registry_id_seed.as_ref(),
            version_seed.as_ref(),
        ],
        bump,
    )]
    pub release: Account<'info, Release>,

    pub system_program: Program<'info, System>,
}
