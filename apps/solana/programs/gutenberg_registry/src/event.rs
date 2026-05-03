use anchor_lang::prelude::*;

#[event]
pub struct ReleasePublished {
    pub publisher: Pubkey,
    pub release_address: Pubkey,
    pub publication_address: Pubkey,
    pub schema_version: u8,
    pub registry_id: String,
    pub version: String,
    pub manifest_uri: String,
    pub manifest_hash: [u8; 32],
    pub content_hash: [u8; 32],
    pub content_size_bytes: u64,
    pub published_at_unix: i64,
    pub published_at_slot: u64,
}
