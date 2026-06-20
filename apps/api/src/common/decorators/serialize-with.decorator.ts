import { SetMetadata } from '@nestjs/common';
import type { ClassConstructor } from 'class-transformer';

export const SERIALIZE_WITH_KEY = Symbol('SERIALIZE_WITH');

export const SerializeWith = (class_type: ClassConstructor<object>) =>
  SetMetadata(SERIALIZE_WITH_KEY, class_type);
