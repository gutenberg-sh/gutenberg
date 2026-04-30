use anchor_lang::prelude::*;

#[event]
pub struct ReleasePublished {
    pub publisher: Pubkey,
    pub release: Pubkey,
    pub name_authority: Pubkey,
    pub name: String,
    pub version: String,
    pub manifest_uri: String,
    pub manifest_hash: [u8; 32],
    pub created_at_unix: i64,
    pub name_authority_release_count: u32,
}

#[event]
pub struct ReleaseUnpublished {
    pub publisher: Pubkey,
    pub release: Pubkey,
    pub name_authority: Pubkey,
    pub name: String,
    pub version: String,
    pub name_authority_release_count: u32,
    pub name_authority_closed: bool,
}
