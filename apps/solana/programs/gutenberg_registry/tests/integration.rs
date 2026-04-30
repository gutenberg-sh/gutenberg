//! Integration tests for the gutenberg_registry program.
//!
//! These run against the BPF-compiled program inside an in-process LiteSVM.
//! Build the program first with `cargo build-sbf` (or `pnpm run anchor:test`
//! from `apps/solana`), which drops the .so at
//! `apps/solana/target/deploy/gutenberg_registry.so`.

use anchor_lang::solana_program::system_program;
use anchor_lang::{AccountDeserialize, AnchorSerialize};
use gutenberg_registry::{NameAuthority, Release};
use litesvm::LiteSVM;
use solana_sdk::{
    instruction::{AccountMeta, Instruction, InstructionError},
    pubkey::Pubkey,
    signature::{Keypair, Signer},
    transaction::{Transaction, TransactionError},
};

const PROGRAM_ID: Pubkey = gutenberg_registry::ID;

const ANCHOR_ERROR_OFFSET: u32 = 6000;
const ERR_NAME_TOO_LONG: u32 = ANCHOR_ERROR_OFFSET; // 6000
const ERR_INVALID_SEED_HASH: u32 = ANCHOR_ERROR_OFFSET + 3; // 6003
const ERR_NAME_ALREADY_CLAIMED: u32 = ANCHOR_ERROR_OFFSET + 4; // 6004

// anchor_lang::error::ErrorCode::ConstraintSeeds
const ERR_CONSTRAINT_SEEDS: u32 = 2006;

fn program_so_path() -> String {
    if let Ok(p) = std::env::var("GUTENBERG_REGISTRY_SO_PATH") {
        return p;
    }
    let manifest_dir = env!("CARGO_MANIFEST_DIR");
    format!("{manifest_dir}/../../target/deploy/gutenberg_registry.so")
}

fn setup() -> LiteSVM {
    let mut svm = LiteSVM::new();
    let so_path = program_so_path();
    svm.add_program_from_file(PROGRAM_ID, &so_path)
        .unwrap_or_else(|e| {
            panic!(
                "failed to load program from {so_path}: {e:?}\n\
                 hint: run `pnpm run anchor:test` from apps/solana, or \
                 `cargo build-sbf --manifest-path programs/gutenberg_registry/Cargo.toml \
                 --sbf-out-dir target/deploy` first."
            )
        });
    svm
}

fn funded_keypair(svm: &mut LiteSVM, lamports: u64) -> Keypair {
    let kp = Keypair::new();
    svm.airdrop(&kp.pubkey(), lamports).unwrap();
    kp
}

fn name_seed(name: &str) -> [u8; 32] {
    solana_sha256_hasher::hashv(&[name.as_bytes()]).to_bytes()
}

fn name_authority_pda(name_seed: &[u8; 32]) -> Pubkey {
    let (pda, _) = Pubkey::find_program_address(&[b"name", name_seed.as_ref()], &PROGRAM_ID);
    pda
}

fn release_pda(publisher: &Pubkey, name_seed: &[u8; 32], version_seed: &[u8; 32]) -> Pubkey {
    let (pda, _) = Pubkey::find_program_address(
        &[
            b"release",
            publisher.as_ref(),
            name_seed.as_ref(),
            version_seed.as_ref(),
        ],
        &PROGRAM_ID,
    );
    pda
}

fn anchor_discriminator(ix_name: &str) -> [u8; 8] {
    let preimage = format!("global:{ix_name}");
    let full = solana_sha256_hasher::hashv(&[preimage.as_bytes()]).to_bytes();
    let mut disc = [0u8; 8];
    disc.copy_from_slice(&full[..8]);
    disc
}

#[derive(AnchorSerialize)]
struct PublishArgs {
    site_name: String,
    site_version: String,
    manifest_uri: String,
    manifest_hash: [u8; 32],
    created_at_unix: i64,
    name_seed: [u8; 32],
    version_seed: [u8; 32],
}

#[derive(AnchorSerialize)]
struct UnpublishArgs {
    site_name: String,
    site_version: String,
    name_seed: [u8; 32],
    version_seed: [u8; 32],
}

#[allow(clippy::too_many_arguments)]
fn publish_ix(
    publisher: &Pubkey,
    site_name: &str,
    site_version: &str,
    manifest_uri: &str,
    manifest_hash: [u8; 32],
    created_at_unix: i64,
    name_seed_override: Option<[u8; 32]>,
    version_seed_override: Option<[u8; 32]>,
) -> Instruction {
    let n_seed = name_seed_override.unwrap_or_else(|| name_seed(site_name));
    let v_seed = version_seed_override.unwrap_or_else(|| name_seed(site_version));

    // Anchor derives the expected PDA from the seed *instruction args*, so
    // we must derive the addresses we pass from those same values for the
    // seeds-constraint to match. The program then independently re-hashes
    // `site_name` / `site_version` and asserts the hash equals the seed
    // arg — that's what `InvalidSeedHash` guards against, and what the
    // override path lets us provoke.
    let na_pda = name_authority_pda(&n_seed);
    let rel_pda = release_pda(publisher, &n_seed, &v_seed);

    let mut data = anchor_discriminator("publish_release").to_vec();
    PublishArgs {
        site_name: site_name.to_string(),
        site_version: site_version.to_string(),
        manifest_uri: manifest_uri.to_string(),
        manifest_hash,
        created_at_unix,
        name_seed: n_seed,
        version_seed: v_seed,
    }
    .serialize(&mut data)
    .unwrap();

    Instruction {
        program_id: PROGRAM_ID,
        accounts: vec![
            AccountMeta::new(*publisher, true),
            AccountMeta::new(na_pda, false),
            AccountMeta::new(rel_pda, false),
            AccountMeta::new_readonly(system_program::ID, false),
        ],
        data,
    }
}

fn unpublish_ix(publisher: &Pubkey, site_name: &str, site_version: &str) -> Instruction {
    let n_seed = name_seed(site_name);
    let v_seed = name_seed(site_version);
    let na_pda = name_authority_pda(&n_seed);
    let rel_pda = release_pda(publisher, &n_seed, &v_seed);

    let mut data = anchor_discriminator("unpublish_release").to_vec();
    UnpublishArgs {
        site_name: site_name.to_string(),
        site_version: site_version.to_string(),
        name_seed: n_seed,
        version_seed: v_seed,
    }
    .serialize(&mut data)
    .unwrap();

    Instruction {
        program_id: PROGRAM_ID,
        accounts: vec![
            AccountMeta::new(*publisher, true),
            AccountMeta::new(na_pda, false),
            AccountMeta::new(rel_pda, false),
            AccountMeta::new_readonly(system_program::ID, false),
        ],
        data,
    }
}

fn send(svm: &mut LiteSVM, payer: &Keypair, ix: Instruction) -> Result<Vec<String>, TransactionError> {
    let tx = Transaction::new_signed_with_payer(
        &[ix],
        Some(&payer.pubkey()),
        &[payer],
        svm.latest_blockhash(),
    );
    svm.send_transaction(tx)
        .map(|m| m.logs)
        .map_err(|f| f.err)
}

fn assert_custom_error(err: &TransactionError, expected_code: u32) {
    match err {
        TransactionError::InstructionError(_, InstructionError::Custom(code)) => {
            assert_eq!(
                *code, expected_code,
                "expected custom error {expected_code}, got {code} (full err: {err:?})"
            );
        }
        other => panic!("expected Custom error {expected_code}, got {other:?}"),
    }
}

fn read_release(svm: &LiteSVM, addr: &Pubkey) -> Release {
    let acc = svm
        .get_account(addr)
        .unwrap_or_else(|| panic!("release account {addr} missing"));
    let mut data: &[u8] = &acc.data;
    Release::try_deserialize(&mut data).expect("decode Release")
}

fn read_name_authority(svm: &LiteSVM, addr: &Pubkey) -> NameAuthority {
    let acc = svm
        .get_account(addr)
        .unwrap_or_else(|| panic!("name authority account {addr} missing"));
    let mut data: &[u8] = &acc.data;
    NameAuthority::try_deserialize(&mut data).expect("decode NameAuthority")
}

fn manifest_hash_of(uri: &str) -> [u8; 32] {
    solana_sha256_hasher::hashv(&[b"manifest:", uri.as_bytes()]).to_bytes()
}

#[test]
fn publish_release_happy_path() {
    let mut svm = setup();
    let publisher = funded_keypair(&mut svm, 1_000_000_000);

    let site = "my-site";
    let version = "1.0.0";
    let uri = "ipfs://bafy-manifest";
    let mhash = manifest_hash_of(uri);
    let created_at = 1_700_000_000_i64;

    let logs = send(
        &mut svm,
        &publisher,
        publish_ix(&publisher.pubkey(), site, version, uri, mhash, created_at, None, None),
    )
    .expect("publish should succeed");

    let na = read_name_authority(&svm, &name_authority_pda(&name_seed(site)));
    assert_eq!(na.authority, publisher.pubkey());
    assert_eq!(na.release_count, 1);

    let rel_addr = release_pda(
        &publisher.pubkey(),
        &name_seed(site),
        &name_seed(version),
    );
    let rel = read_release(&svm, &rel_addr);
    assert_eq!(rel.publisher, publisher.pubkey());
    assert_eq!(rel.name, site);
    assert_eq!(rel.version, version);
    assert_eq!(rel.manifest_uri, uri);
    assert_eq!(rel.manifest_hash, mhash);
    assert_eq!(rel.created_at_unix, created_at);

    // Anchor's `emit!` writes a "Program data: <base64>" line per event.
    assert!(
        logs.iter().any(|l| l.starts_with("Program data:")),
        "expected ReleasePublished event log, got: {logs:?}"
    );
}

#[test]
fn publish_release_two_versions_increments_release_count() {
    let mut svm = setup();
    let publisher = funded_keypair(&mut svm, 2_000_000_000);

    let site = "tour";
    for v in ["0.1.0", "0.2.0"] {
        send(
            &mut svm,
            &publisher,
            publish_ix(
                &publisher.pubkey(),
                site,
                v,
                "ipfs://manifest",
                manifest_hash_of(v),
                1_700_000_000,
                None,
                None,
            ),
        )
        .expect("publish should succeed");
    }

    let na = read_name_authority(&svm, &name_authority_pda(&name_seed(site)));
    assert_eq!(na.authority, publisher.pubkey());
    assert_eq!(na.release_count, 2);
}

#[test]
fn publish_release_rejects_invalid_name_seed() {
    let mut svm = setup();
    let publisher = funded_keypair(&mut svm, 1_000_000_000);

    let bogus_seed = [0xAAu8; 32];
    let err = send(
        &mut svm,
        &publisher,
        publish_ix(
            &publisher.pubkey(),
            "site-a",
            "1.0.0",
            "ipfs://m",
            [0u8; 32],
            1,
            Some(bogus_seed),
            None,
        ),
    )
    .expect_err("invalid name_seed must fail");

    assert_custom_error(&err, ERR_INVALID_SEED_HASH);
}

#[test]
fn publish_release_rejects_invalid_version_seed() {
    let mut svm = setup();
    let publisher = funded_keypair(&mut svm, 1_000_000_000);

    let bogus_seed = [0xBBu8; 32];
    let err = send(
        &mut svm,
        &publisher,
        publish_ix(
            &publisher.pubkey(),
            "site-b",
            "1.0.0",
            "ipfs://m",
            [0u8; 32],
            1,
            None,
            Some(bogus_seed),
        ),
    )
    .expect_err("invalid version_seed must fail");

    assert_custom_error(&err, ERR_INVALID_SEED_HASH);
}

#[test]
fn publish_release_rejects_name_too_long() {
    let mut svm = setup();
    let publisher = funded_keypair(&mut svm, 1_000_000_000);

    // Release::MAX_NAME_LEN = 64
    let too_long = "n".repeat(65);
    let err = send(
        &mut svm,
        &publisher,
        publish_ix(
            &publisher.pubkey(),
            &too_long,
            "1.0.0",
            "ipfs://m",
            [0u8; 32],
            1,
            None,
            None,
        ),
    )
    .expect_err("oversize name must fail");

    assert_custom_error(&err, ERR_NAME_TOO_LONG);
}

#[test]
fn publish_release_rejects_name_already_claimed_by_other_publisher() {
    let mut svm = setup();
    let alice = funded_keypair(&mut svm, 2_000_000_000);
    let bob = funded_keypair(&mut svm, 2_000_000_000);

    let site = "shared-name";
    send(
        &mut svm,
        &alice,
        publish_ix(
            &alice.pubkey(),
            site,
            "1.0.0",
            "ipfs://a",
            [1u8; 32],
            1,
            None,
            None,
        ),
    )
    .expect("alice publishes first");

    let err = send(
        &mut svm,
        &bob,
        publish_ix(
            &bob.pubkey(),
            site,
            "1.0.0",
            "ipfs://b",
            [2u8; 32],
            2,
            None,
            None,
        ),
    )
    .expect_err("bob must be rejected");

    assert_custom_error(&err, ERR_NAME_ALREADY_CLAIMED);
}

#[test]
fn unpublish_release_closes_name_authority_when_last_release_removed() {
    let mut svm = setup();
    let publisher = funded_keypair(&mut svm, 2_000_000_000);

    let site = "solo";
    let version = "1.0.0";
    send(
        &mut svm,
        &publisher,
        publish_ix(
            &publisher.pubkey(),
            site,
            version,
            "ipfs://m",
            [3u8; 32],
            1,
            None,
            None,
        ),
    )
    .expect("publish");

    let rel_addr = release_pda(&publisher.pubkey(), &name_seed(site), &name_seed(version));
    let na_addr = name_authority_pda(&name_seed(site));
    assert!(svm.get_account(&rel_addr).is_some());
    assert!(svm.get_account(&na_addr).is_some());

    let publisher_balance_before = svm.get_account(&publisher.pubkey()).unwrap().lamports;

    send(
        &mut svm,
        &publisher,
        unpublish_ix(&publisher.pubkey(), site, version),
    )
    .expect("unpublish");

    // LiteSVM purges fully-closed accounts (zero lamports + empty data +
    // owned by system program), so they vanish from the account store.
    assert!(
        is_account_gone(&svm, &rel_addr),
        "release account should be closed"
    );
    assert!(
        is_account_gone(&svm, &na_addr),
        "name_authority account should be closed"
    );

    // Rent of both closed accounts (minus tx fee) flows back to the publisher.
    let publisher_balance_after = svm.get_account(&publisher.pubkey()).unwrap().lamports;
    assert!(
        publisher_balance_after > publisher_balance_before,
        "publisher should reclaim rent (before={publisher_balance_before}, after={publisher_balance_after})",
    );
}

fn is_account_gone(svm: &LiteSVM, addr: &Pubkey) -> bool {
    match svm.get_account(addr) {
        None => true,
        Some(a) => a.lamports == 0 && a.data.is_empty() && a.owner == system_program::ID,
    }
}

#[test]
fn unpublish_release_decrements_count_when_other_versions_remain() {
    let mut svm = setup();
    let publisher = funded_keypair(&mut svm, 3_000_000_000);

    let site = "kept";
    for v in ["1.0.0", "1.1.0"] {
        send(
            &mut svm,
            &publisher,
            publish_ix(
                &publisher.pubkey(),
                site,
                v,
                "ipfs://m",
                [4u8; 32],
                1,
                None,
                None,
            ),
        )
        .expect("publish");
    }

    send(
        &mut svm,
        &publisher,
        unpublish_ix(&publisher.pubkey(), site, "1.0.0"),
    )
    .expect("unpublish 1.0.0");

    let removed = release_pda(
        &publisher.pubkey(),
        &name_seed(site),
        &name_seed("1.0.0"),
    );
    assert!(
        is_account_gone(&svm, &removed),
        "unpublished release should be closed"
    );

    let kept = release_pda(
        &publisher.pubkey(),
        &name_seed(site),
        &name_seed("1.1.0"),
    );
    let kept_rel = read_release(&svm, &kept);
    assert_eq!(kept_rel.version, "1.1.0");

    let na = read_name_authority(&svm, &name_authority_pda(&name_seed(site)));
    assert_eq!(na.authority, publisher.pubkey());
    assert_eq!(
        na.release_count, 1,
        "name_authority should remain with decremented count"
    );
}

#[test]
fn unpublish_release_rejects_other_publisher() {
    // The release PDA is seeded with the publisher key, so a different
    // signer can't address Alice's release at all — the seeds constraint
    // catches it before the in-program publisher check ever runs.
    let mut svm = setup();
    let alice = funded_keypair(&mut svm, 2_000_000_000);
    let bob = funded_keypair(&mut svm, 2_000_000_000);

    let site = "alices-site";
    let version = "1.0.0";
    send(
        &mut svm,
        &alice,
        publish_ix(
            &alice.pubkey(),
            site,
            version,
            "ipfs://m",
            [5u8; 32],
            1,
            None,
            None,
        ),
    )
    .expect("alice publishes");

    let err = send(
        &mut svm,
        &bob,
        unpublish_ix(&bob.pubkey(), site, version),
    )
    .expect_err("bob must fail");

    // Bob can't pass alice's release PDA because the constraint re-derives
    // the PDA from his pubkey; LiteSVM surfaces this as either the seeds
    // constraint or AccountNotInitialized depending on which check fires
    // first. Either way, this is not a custom (>=6000) error.
    match &err {
        TransactionError::InstructionError(_, InstructionError::Custom(code)) => {
            assert!(
                *code < ANCHOR_ERROR_OFFSET,
                "expected an anchor framework error, got program error {code}"
            );
            assert!(
                *code == ERR_CONSTRAINT_SEEDS || *code == 3012, /* AccountNotInitialized */
                "unexpected anchor error code {code}"
            );
        }
        other => panic!("expected anchor InstructionError::Custom, got {other:?}"),
    }

    // Alice's release is untouched.
    let alice_rel = release_pda(&alice.pubkey(), &name_seed(site), &name_seed(version));
    let rel = read_release(&svm, &alice_rel);
    assert_eq!(rel.publisher, alice.pubkey());
}
