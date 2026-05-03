import { ForbiddenException, Injectable, PipeTransform } from '@nestjs/common';

interface RelationOptions {
  allowed: readonly string[];
  blocked?: readonly string[];
}

type IncludesTree = Record<string, IncludesNode>;

interface IncludesNode {
  with: IncludesTree;
}

@Injectable()
export class IncludesPipe implements PipeTransform<
  string | string[] | undefined,
  Record<string, object>
> {
  constructor(private readonly options: RelationOptions) {}

  transform(value: string | string[] | undefined): Record<string, object> {
    if (!value) {
      return {};
    }

    const parsed = typeof value === 'string' ? value.split(',') : value;
    const trimmed = parsed.map((entry) => entry.trim()).filter(Boolean);
    const result: IncludesTree = {};

    for (const key of trimmed) {
      const segments = key.split('.');

      if (!this.is_allowed(segments)) {
        throw new ForbiddenException(`The relation '${key}' is not allowed.`);
      }

      if (this.is_blocked(key)) {
        throw new ForbiddenException(`The relation '${key}' is blocked.`);
      }

      this.build_tree(segments, result);
    }

    return result;
  }

  private is_allowed(segments: string[]): boolean {
    const key = segments.join('.');

    if (this.options.allowed.includes(key)) {
      return true;
    }

    return this.options.allowed.some((allowed) =>
      allowed.startsWith(`${key}.`),
    );
  }

  private is_blocked(key: string): boolean {
    return (this.options.blocked ?? []).some((blocked) =>
      key.startsWith(blocked),
    );
  }

  private build_tree(segments: string[], result: IncludesTree): void {
    let current_level = result;

    segments.forEach((segment, index) => {
      if (
        !current_level[segment] ||
        typeof current_level[segment] !== 'object'
      ) {
        current_level[segment] = { with: {} };
      }

      if (index < segments.length - 1) {
        if (!current_level[segment].with) {
          current_level[segment].with = {};
        }

        current_level = current_level[segment].with;
      }
    });
  }
}
