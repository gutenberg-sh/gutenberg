use anchor_lang::prelude::*;

#[account]
pub struct NameAuthority {
    pub authority: Pubkey,
}

impl NameAuthority {
    pub const SPACE: usize = 8 + 32;
}

#[account]
pub struct Release {
    pub schema_version: u8,

    pub publisher: Pubkey,
    pub name: String,
    pub version: String,

    pub manifest_uri: String,
    pub manifest_hash: [u8; 32],

    pub content_hash: [u8; 32],
    pub content_size_bytes: u64,

    pub created_at_unix: i64,
    pub created_at_slot: u64,
}

impl Release {
    pub const MAX_NAME_LEN: usize = 64;
    pub const MAX_VERSION_LEN: usize = 32;
    pub const MAX_URI_LEN: usize = 512;

    pub const CURRENT_SCHEMA_VERSION: u8 = 1;

    pub const SPACE: usize = 8
        + 1
        + 32
        + 4 + Self::MAX_NAME_LEN
        + 4 + Self::MAX_VERSION_LEN
        + 4 + Self::MAX_URI_LEN
        + 32
        + 32
        + 8
        + 8
        + 8;
}
