export const REGISTRY_ID_RE = /^[a-z0-9][a-z0-9._-]*$/;

export function parse_registry_id_at_version(
  spec: string,
  label: string,
): { registry_id: string; version: string } {
  const trimmed = spec.trim();
  const at = trimmed.indexOf('@');

  if (at <= 0 || at === trimmed.length - 1) {
    throw new Error(
      `${label}: expected registry_id@version (e.g. my-thing@1.0.0), got "${trimmed}"`,
    );
  }

  const registry_id = trimmed.slice(0, at);
  const version = trimmed.slice(at + 1);

  if (!REGISTRY_ID_RE.test(registry_id)) {
    throw new Error(
      `${label}: registry id must match publication id rules, got "${registry_id}"`,
    );
  }

  if (!version) {
    throw new Error(`${label}: version must not be empty`);
  }

  return { registry_id, version };
}

export function assert_valid_registry_id(
  registry_id: string,
  label: string,
): void {
  if (!REGISTRY_ID_RE.test(registry_id)) {
    throw new Error(
      `${label}: registry id must match publication id rules, got "${registry_id}"`,
    );
  }
}
