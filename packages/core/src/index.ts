// SPDX-License-Identifier: MPL-2.0

// Export main helper functions
export {
  createArkTypeDto,
  arkWithMeta,
  type InferredPropertyKeys,
} from './arktype.helpers';

export type {
  PropertyMetadata,
  SchemaMetadata,
} from './arktype.helpers';

// Export validation pipe
export { ArkTypeValidationPipe } from './arktype-validation.pipe';

// Export schema metadata helpers
export {
  applySchemaMetadata,
  collectDtoClasses,
} from './schema-metadata.helper';

