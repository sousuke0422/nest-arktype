import { describe, it, expect } from 'vitest';
import { type, Type } from 'arktype';
import { applySchemaMetadata, collectDtoClasses } from './schema-metadata.helper';
import { createArkTypeDto, arkWithMeta } from './arktype.helpers';

describe('Schema Metadata Helper', () => {
  describe('collectDtoClasses', () => {
    it('should collect DTO classes with ArkType schemas', () => {
      // Use unique schema definitions per test to avoid state sharing
      const UserSchemaForCollection = type({ username: 'string' });
      const ProductSchemaForCollection = type({ productTitle: 'string' });

      class UserDtoForCollection extends createArkTypeDto(UserSchemaForCollection) {}
      class ProductDtoForCollection extends createArkTypeDto(ProductSchemaForCollection) {}

      const dtoModule = {
        UserDtoForCollection,
        ProductDtoForCollection,
        SomeOtherExport: 'not a class',
      };

      const result = collectDtoClasses(dtoModule);

      expect(result).toHaveLength(2);
      expect(result).toContain(UserDtoForCollection);
      expect(result).toContain(ProductDtoForCollection);
    });

    it('should skip classes without ArkType schemas', () => {
      const UserSchemaForSkip = type({ userName: 'string' });
      class UserDtoForSkip extends createArkTypeDto(UserSchemaForSkip) {}
      class RegularClass {}

      const dtoModule = {
        UserDtoForSkip,
        RegularClass,
      };

      const result = collectDtoClasses(dtoModule);

      expect(result).toHaveLength(1);
      expect(result).toContain(UserDtoForSkip);
      expect(result).not.toContain(RegularClass);
    });

    it('should handle empty module', () => {
      const result = collectDtoClasses({});
      expect(result).toHaveLength(0);
    });
  });

  describe('applySchemaMetadata', () => {
    it('should add schema-level example to OpenAPI document', () => {
      const SchemaWithExample = arkWithMeta(
        type({ fullName: 'string', emailAddr: 'string' }),
        {
          example: { fullName: 'John', emailAddr: 'john@example.com' },
        }
      );

      class DtoWithExample extends createArkTypeDto(SchemaWithExample) {}

      const document = {
        components: {
          schemas: {
            DtoWithExample: {
              type: 'object',
              properties: {
                fullName: { type: 'string' },
                emailAddr: { type: 'string' },
              },
            },
          },
        },
      };

      const result = applySchemaMetadata(document, [DtoWithExample]);

      expect(result.components.schemas.DtoWithExample.example).toEqual({
        fullName: 'John',
        emailAddr: 'john@example.com',
      });
    });

    it('should add schema-level description to OpenAPI document', () => {
      const SchemaWithDesc = arkWithMeta(
        type({ personName: 'string' }),
        {
          description: 'User creation data',
        }
      );

      class DtoWithDesc extends createArkTypeDto(SchemaWithDesc) {}

      const document = {
        components: {
          schemas: {
            DtoWithDesc: {
              type: 'object',
              properties: {
                personName: { type: 'string' },
              },
            },
          },
        },
      };

      const result = applySchemaMetadata(document, [DtoWithDesc]);

      expect(result.components.schemas.DtoWithDesc.description).toBe('User creation data');
    });

    it('should add both example and description', () => {
      const SchemaWithBoth = arkWithMeta(
        type({ identifier: 'string' }),
        {
          description: 'User data',
          example: { identifier: 'John' },
        }
      );

      class DtoWithBoth extends createArkTypeDto(SchemaWithBoth) {}

      const document = {
        components: {
          schemas: {
            DtoWithBoth: {
              type: 'object',
              properties: {
                identifier: { type: 'string' },
              },
            },
          },
        },
      };

      const result = applySchemaMetadata(document, [DtoWithBoth]);

      expect(result.components.schemas.DtoWithBoth.description).toBe('User data');
      expect(result.components.schemas.DtoWithBoth.example).toEqual({ identifier: 'John' });
    });

    it('should not add metadata if DTO has no custom metadata', () => {
      // Create a fresh schema for this test
      const SchemaWithoutMeta = type({ value: 'string' });
      class DtoWithoutMeta extends createArkTypeDto(SchemaWithoutMeta) {}

      // Verify schema has no __meta
      expect((SchemaWithoutMeta as any).__meta).toBeUndefined();

      const document = {
        components: {
          schemas: {
            DtoWithoutMeta: {
              type: 'object',
              properties: {
                value: { type: 'string' },
              },
            },
          },
        },
      };

      // Store original values
      const originalExample = document.components.schemas.DtoWithoutMeta.example;
      const originalDescription = document.components.schemas.DtoWithoutMeta.description;

      const result = applySchemaMetadata(document, [DtoWithoutMeta]);

      // Should not modify if no metadata
      expect(result.components.schemas.DtoWithoutMeta.example).toBe(originalExample);
      expect(result.components.schemas.DtoWithoutMeta.description).toBe(originalDescription);
    });

    it('should handle multiple DTOs', () => {
      const FirstSchema = arkWithMeta(
        type({ firstName: 'string' }),
        {
          description: 'First data',
          example: { firstName: 'John' },
        }
      );

      const SecondSchema = arkWithMeta(
        type({ secondTitle: 'string' }),
        {
          description: 'Second data',
          example: { secondTitle: 'Widget' },
        }
      );

      class FirstDto extends createArkTypeDto(FirstSchema) {}
      class SecondDto extends createArkTypeDto(SecondSchema) {}

      const document = {
        components: {
          schemas: {
            FirstDto: {
              type: 'object',
              properties: { firstName: { type: 'string' } },
            },
            SecondDto: {
              type: 'object',
              properties: { secondTitle: { type: 'string' } },
            },
          },
        },
      };

      const result = applySchemaMetadata(document, [FirstDto, SecondDto]);

      expect(result.components.schemas.FirstDto.description).toBe('First data');
      expect(result.components.schemas.FirstDto.example).toEqual({ firstName: 'John' });
      expect(result.components.schemas.SecondDto.description).toBe('Second data');
      expect(result.components.schemas.SecondDto.example).toEqual({ secondTitle: 'Widget' });
    });

    it('should handle missing schemas gracefully', () => {
      const MissingSchema = arkWithMeta(
        type({ missingField: 'string' }),
        {
          description: 'Missing data',
        }
      );

      class MissingDto extends createArkTypeDto(MissingSchema) {}

      const document = {
        components: {
          schemas: {},
        },
      };

      // Should not throw
      expect(() => applySchemaMetadata(document, [MissingDto])).not.toThrow();
    });

    it('should handle document without components', () => {
      const NoComponentSchema = arkWithMeta(
        type({ field: 'string' }),
        {
          description: 'No component data',
        }
      );

      class NoComponentDto extends createArkTypeDto(NoComponentSchema) {}

      const document = {};

      // Should not throw
      expect(() => applySchemaMetadata(document, [NoComponentDto])).not.toThrow();
    });
  });
});
