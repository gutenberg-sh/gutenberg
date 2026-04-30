import { Injectable } from '@nestjs/common';

import { KeysService } from '../keys/keys.service';
import { RegistryService } from '../registry/registry.service';

@Injectable()
export class UnpublishService {
  constructor(
    private readonly keys_service: KeysService,
    private readonly registry_service: RegistryService,
  ) {}

  async unpublish_site(input: {
    name: string;
    version: string;
  }): Promise<void> {
    await this.registry_service.assert_can_publish();
    const { publisher } = this.keys_service.load_publisher_key();
    const release = await this.registry_service.find_release({
      name: input.name,
      version: input.version,
      publisher,
    });

    if (!release) {
      throw new Error(
        `No release ${input.name}@${input.version} for this wallet; only the publisher that created it may unpublish`,
      );
    }

    await this.registry_service.unpublish_release(input);
  }

  async unpublish_all_for_name(name: string): Promise<void> {
    await this.registry_service.assert_can_publish();
    const { publisher } = this.keys_service.load_publisher_key();
    const releases = await this.registry_service.list_releases();
    const versions = [
      ...new Set(
        releases
          .filter((r) => r.name === name && r.publisher === publisher)
          .map((r) => r.version),
      ),
    ].sort();

    if (versions.length === 0) {
      throw new Error(
        `No releases found for "${name}" published by this wallet`,
      );
    }

    await this.registry_service.unpublish_releases_batch({ name, versions });
  }
}
