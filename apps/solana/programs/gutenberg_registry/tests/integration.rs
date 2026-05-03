use anchor_lang::solana_program::system_program;
use anchor_lang::{AccountDeserialize, AnchorSerialize};
use gutenberg_registry::{Publication, Release};
use litesvm::LiteSVM;
use solana_sdk::{
    instruction::{AccountMeta, Instruction, InstructionError},
    pubkey::Pubkey,
    signature::{Keypair, Signer},
    transaction::{Transaction, TransactionError},
};

const PROGRAM_ID: Pubkey = gutenberg_registry::ID;

const ANCHOR_ERROR_OFFSET: u32 = 6000;
const ERR_REGISTRY_ID_TOO_LONG: u32 = ANCHOR_ERROR_OFFSET;
const ERR_INVALID_SEED_HASH: u32 = ANCHOR_ERROR_OFFSET + 3;
const ERR_REGISTRY_ID_ALREADY_CLAIMED: u32 = ANCHOR_ERROR_OFFSET + 4;

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

    let mut clock = svm.get_sysvar::<solana_sdk::clock::Clock>();
    clock.unix_timestamp = 1_700_000_000;
    clock.slot = 100;
    svm.set_sysvar::<solana_sdk::clock::Clock>(&clock);

    svm
}

fn next_slot(svm: &mut LiteSVM) {
    let mut clock = svm.get_sysvar::<solana_sdk::clock::Clock>();
    clock.slot += 1;
    clock.unix_timestamp += 1;
    svm.set_sysvar::<solana_sdk::clock::Clock>(&clock);
    svm.expire_blockhash();
}

fn funded_keypair(svm: &mut LiteSVM, lamports: u64) -> Keypair {
    let kp = Keypair::new();
    svm.airdrop(&kp.pubkey(), lamports).unwrap();
    kp
}

fn registry_id_seed(registry_id: &str) -> [u8; 32] {
    solana_sha256_hasher::hashv(&[registry_id.as_bytes()]).to_bytes()
}

fn publication_address(registry_id_seed: &[u8; 32]) -> Pubkey {
    let (pda, _) =
        Pubkey::find_program_address(&[b"publication", registry_id_seed.as_ref()], &PROGRAM_ID);
    pda
}

fn release_address(registry_id_seed: &[u8; 32], version_seed: &[u8; 32]) -> Pubkey {
    let (pda, _) = Pubkey::find_program_address(
        &[
            b"release",
            registry_id_seed.as_ref(),
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
    registry_id: String,
    version: String,
    manifest_uri: String,
    manifest_hash: [u8; 32],
    content_hash: [u8; 32],
    content_size_bytes: u64,
    registry_id_seed: [u8; 32],
    version_seed: [u8; 32],
}

struct PublishOpts<'a> {
    registry_id: &'a str,
    version: &'a str,
    manifest_uri: &'a str,
    manifest_hash: [u8; 32],
    content_hash: [u8; 32],
    content_size_bytes: u64,
    registry_id_seed_override: Option<[u8; 32]>,
    version_seed_override: Option<[u8; 32]>,
}

fn publish_ix(publisher: &Pubkey, opts: PublishOpts<'_>) -> Instruction {
    let rid_seed = opts
        .registry_id_seed_override
        .unwrap_or_else(|| registry_id_seed(opts.registry_id));
    let v_seed = opts
        .version_seed_override
        .unwrap_or_else(|| registry_id_seed(opts.version));

    let publication_addr = publication_address(&rid_seed);
    let release_addr = release_address(&rid_seed, &v_seed);

    let mut data = anchor_discriminator("publish_release").to_vec();
    PublishArgs {
        registry_id: opts.registry_id.to_string(),
        version: opts.version.to_string(),
        manifest_uri: opts.manifest_uri.to_string(),
        manifest_hash: opts.manifest_hash,
        content_hash: opts.content_hash,
        content_size_bytes: opts.content_size_bytes,
        registry_id_seed: rid_seed,
        version_seed: v_seed,
    }
    .serialize(&mut data)
    .unwrap();

    Instruction {
        program_id: PROGRAM_ID,
        accounts: vec![
            AccountMeta::new(*publisher, true),
            AccountMeta::new(publication_addr, false),
            AccountMeta::new(release_addr, false),
            AccountMeta::new_readonly(system_program::ID, false),
        ],
        data,
    }
}

fn simple_publish(publisher: &Pubkey, registry_id: &str, version: &str) -> Instruction {
    publish_ix(
        publisher,
        PublishOpts {
            registry_id,
            version,
            manifest_uri: "ar://manifest",
            manifest_hash: [1u8; 32],
            content_hash: [2u8; 32],
            content_size_bytes: 1234,
            registry_id_seed_override: None,
            version_seed_override: None,
        },
    )
}

fn send(
    svm: &mut LiteSVM,
    payer: &Keypair,
    ix: Instruction,
) -> Result<Vec<String>, TransactionError> {
    next_slot(svm);

    let tx = Transaction::new_signed_with_payer(
        &[ix],
        Some(&payer.pubkey()),
        &[payer],
        svm.latest_blockhash(),
    );
    svm.send_transaction(tx).map(|m| m.logs).map_err(|f| f.err)
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

fn read_publication(svm: &LiteSVM, addr: &Pubkey) -> Publication {
    let acc = svm
        .get_account(addr)
        .unwrap_or_else(|| panic!("publication account {addr} missing"));
    let mut data: &[u8] = &acc.data;
    Publication::try_deserialize(&mut data).expect("decode Publication")
}

#[test]
fn publish_release_happy_path() {
    let mut svm = setup();
    let publisher = funded_keypair(&mut svm, 1_000_000_000);

    let registry_id = "my-thing";
    let version = "1.0.0";

    let logs = send(
        &mut svm,
        &publisher,
        simple_publish(&publisher.pubkey(), registry_id, version),
    )
    .expect("publish should succeed");

    let pub_acc = read_publication(&svm, &publication_address(&registry_id_seed(registry_id)));
    assert_eq!(pub_acc.owner, publisher.pubkey());

    let rel_addr = release_address(&registry_id_seed(registry_id), &registry_id_seed(version));
    let rel = read_release(&svm, &rel_addr);
    assert_eq!(rel.schema_version, Release::CURRENT_SCHEMA_VERSION);
    assert_eq!(rel.publisher, publisher.pubkey());
    assert_eq!(rel.registry_id, registry_id);
    assert_eq!(rel.version, version);
    assert_eq!(rel.manifest_uri, "ar://manifest");
    assert_eq!(rel.manifest_hash, [1u8; 32]);
    assert_eq!(rel.content_hash, [2u8; 32]);
    assert_eq!(rel.content_size_bytes, 1234);
    assert!(rel.published_at_unix > 0, "clock should populate published_at_unix");
    assert!(rel.published_at_slot > 0);

    assert!(
        logs.iter().any(|l| l.starts_with("Program data:")),
        "expected ReleasePublished event log, got: {logs:?}"
    );
}

#[test]
fn publish_release_two_versions_share_registry_id() {
    let mut svm = setup();
    let publisher = funded_keypair(&mut svm, 2_000_000_000);

    let registry_id = "tour";
    for v in ["0.1.0", "0.2.0"] {
        send(
            &mut svm,
            &publisher,
            simple_publish(&publisher.pubkey(), registry_id, v),
        )
        .expect("publish should succeed");
    }

    let pub_acc = read_publication(&svm, &publication_address(&registry_id_seed(registry_id)));
    assert_eq!(pub_acc.owner, publisher.pubkey());

    for v in ["0.1.0", "0.2.0"] {
        let rel = read_release(
            &svm,
            &release_address(&registry_id_seed(registry_id), &registry_id_seed(v)),
        );
        assert_eq!(rel.version, v);
        assert_eq!(rel.publisher, publisher.pubkey());
    }
}

#[test]
fn publish_release_rejects_invalid_registry_id_seed() {
    let mut svm = setup();
    let publisher = funded_keypair(&mut svm, 1_000_000_000);

    let bogus_seed = [0xAAu8; 32];
    let err = send(
        &mut svm,
        &publisher,
        publish_ix(
            &publisher.pubkey(),
            PublishOpts {
                registry_id: "thing-a",
                version: "1.0.0",
                manifest_uri: "ar://m",
                manifest_hash: [0u8; 32],
                content_hash: [0u8; 32],
                content_size_bytes: 0,
                registry_id_seed_override: Some(bogus_seed),
                version_seed_override: None,
            },
        ),
    )
    .expect_err("invalid registry_id_seed must fail");

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
            PublishOpts {
                registry_id: "thing-b",
                version: "1.0.0",
                manifest_uri: "ar://m",
                manifest_hash: [0u8; 32],
                content_hash: [0u8; 32],
                content_size_bytes: 0,
                registry_id_seed_override: None,
                version_seed_override: Some(bogus_seed),
            },
        ),
    )
    .expect_err("invalid version_seed must fail");

    assert_custom_error(&err, ERR_INVALID_SEED_HASH);
}

#[test]
fn publish_release_rejects_registry_id_too_long() {
    let mut svm = setup();
    let publisher = funded_keypair(&mut svm, 1_000_000_000);

    let too_long = "n".repeat(65);
    let err = send(
        &mut svm,
        &publisher,
        publish_ix(
            &publisher.pubkey(),
            PublishOpts {
                registry_id: &too_long,
                version: "1.0.0",
                manifest_uri: "ar://m",
                manifest_hash: [0u8; 32],
                content_hash: [0u8; 32],
                content_size_bytes: 0,
                registry_id_seed_override: None,
                version_seed_override: None,
            },
        ),
    )
    .expect_err("oversize registry_id must fail");

    assert_custom_error(&err, ERR_REGISTRY_ID_TOO_LONG);
}

#[test]
fn publish_release_rejects_registry_id_already_claimed_by_other_publisher() {
    let mut svm = setup();
    let alice = funded_keypair(&mut svm, 2_000_000_000);
    let bob = funded_keypair(&mut svm, 2_000_000_000);

    send(
        &mut svm,
        &alice,
        simple_publish(&alice.pubkey(), "shared-registry-id", "1.0.0"),
    )
    .expect("alice publishes first");

    let err = send(
        &mut svm,
        &bob,
        simple_publish(&bob.pubkey(), "shared-registry-id", "2.0.0"),
    )
    .expect_err("bob must be rejected");

    assert_custom_error(&err, ERR_REGISTRY_ID_ALREADY_CLAIMED);
}

#[test]
fn cannot_republish_under_same_registry_id_version() {
    let mut svm = setup();
    let publisher = funded_keypair(&mut svm, 3_000_000_000);

    let registry_id = "perm";
    let version = "1.0.0";
    send(
        &mut svm,
        &publisher,
        simple_publish(&publisher.pubkey(), registry_id, version),
    )
    .expect("publish");

    let err = send(
        &mut svm,
        &publisher,
        simple_publish(&publisher.pubkey(), registry_id, version),
    )
    .expect_err("republish at same version must fail");

    match &err {
        TransactionError::InstructionError(_, InstructionError::Custom(code)) => {
            assert!(
                *code < ANCHOR_ERROR_OFFSET,
                "expected an anchor framework error, got program error {code}"
            );
        }
        other => panic!("expected anchor InstructionError::Custom, got {other:?}"),
    }
}
