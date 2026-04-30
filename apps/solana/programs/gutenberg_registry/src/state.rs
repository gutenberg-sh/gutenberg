use anchor_lang::prelude::*;

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
