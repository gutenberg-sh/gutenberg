export const NAME_RE = /^[a-z0-9][a-z0-9._-]*$/;

export function parse_name_at_version(
  spec: string,
  label: string,
): { name: string; version: string } {
  const trimmed = spec.trim();
  const at = trimmed.indexOf('@');

  if (at <= 0 || at === trimmed.length - 1) {
    throw new Error(
      `${label}: expected name@version (e.g. my-thing@1.0.0), got "${trimmed}"`,
    );
  }

  const name = trimmed.slice(0, at);
  const version = trimmed.slice(at + 1);

  if (!NAME_RE.test(name)) {
    throw new Error(
      `${label}: name must match release naming rules, got "${name}"`,
    );
  }

  if (!version) {
    throw new Error(`${label}: version must not be empty`);
  }

  return { name, version };
}

export function assert_valid_name(name: string, label: string): void {
  if (!NAME_RE.test(name)) {
    throw new Error(
      `${label}: name must match release naming rules, got "${name}"`,
    );
  }
}
