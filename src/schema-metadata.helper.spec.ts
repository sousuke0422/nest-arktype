import { describe, it, expect } from 'vitest';
import { type, Type } from 'arktype';
import { applySchemaMetadata, collectDtoClasses } from './schema-metadata.helper';
import { createArkTypeDto, arkWithMeta } from './arktype.helpers';

describe('Schema Metadata Helper', () => {
  describe('collectDtoClasses', () => {
    it('should collect DTO classes with ArkType schemas', () => {
      const UserSchema = type({ name: 'string' });
      const ProductSchema = type({ title: 'string' });

      class UserDto extends createArkTypeDto(UserSchema) {}
      class ProductDto extends createArkTypeDto(ProductSchema) {}

      const dtoModule = {
        UserDto,
        ProductDto,
        SomeOtherExport: 'not a class',
      };

      const result = collectDtoClasses(dtoModule);

      expect(result).toHaveLength(2);
      expect(result).toContain(UserDto);
      expect(result).toContain(ProductDto);
    });

    it('should skip classes without ArkType schemas', () => {
      const UserSchema = type({ name: 'string' });
      class UserDto extends createArkTypeDto(UserSchema) {}
      class RegularClass {}

      const dtoModule = {
        UserDto,
        RegularClass,
      };

      const result = collectDtoClasses(dtoModule);

      expect(result).toHaveLength(1);
      expect(result).toContain(UserDto);
      expect(result).not.toContain(RegularClass);
    });

    it('should handle empty module', () => {
      const result = collectDtoClasses({});
      expect(result).toHaveLength(0);
    });
  });

  describe('applySchemaMetadata', () => {
    it('should add schema-level example to OpenAPI document', () => {
      const UserSchema = arkWithMeta(
        type({ name: 'string', email: 'string' }),
        {
          example: { name: 'John', email: 'john@example.com' },
        }
      );

      class UserDto extends createArkTypeDto(UserSchema) {}

      const document = {
        components: {
          schemas: {
            UserDto: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                email: { type: 'string' },
              },
            },
          },
        },
      };

      const result = applySchemaMetadata(document, [UserDto]);

      expect(result.components.schemas.UserDto.example).toEqual({
        name: 'John',
        email: 'john@example.com',
      });
    });

    it('should add schema-level description to OpenAPI document', () => {
      const UserSchema = arkWithMeta(
        type({ name: 'string' }),
        {
          description: 'User creation data',
        }
      );

      class UserDto extends createArkTypeDto(UserSchema) {}

      const document = {
        components: {
          schemas: {
            UserDto: {
              type: 'object',
              properties: {
                name: { type: 'string' },
              },
            },
          },
        },
      };

      const result = applySchemaMetadata(document, [UserDto]);

      expect(result.components.schemas.UserDto.description).toBe('User creation data');
    });

    it('should add both example and description', () => {
      const UserSchema = arkWithMeta(
        type({ name: 'string' }),
        {
          description: 'User data',
          example: { name: 'John' },
        }
      );

      class UserDto extends createArkTypeDto(UserSchema) {}

      const document = {
        components: {
          schemas: {
            UserDto: {
              type: 'object',
              properties: {
                name: { type: 'string' },
              },
            },
          },
        },
      };

      const result = applySchemaMetadata(document, [UserDto]);

      expect(result.components.schemas.UserDto.description).toBe('User data');
      expect(result.components.schemas.UserDto.example).toEqual({ name: 'John' });
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
      const UserSchema = arkWithMeta(
        type({ name: 'string' }),
        {
          description: 'User data',
          example: { name: 'John' },
        }
      );

      const ProductSchema = arkWithMeta(
        type({ title: 'string' }),
        {
          description: 'Product data',
          example: { title: 'Widget' },
        }
      );

      class UserDto extends createArkTypeDto(UserSchema) {}
      class ProductDto extends createArkTypeDto(ProductSchema) {}

      const document = {
        components: {
          schemas: {
            UserDto: {
              type: 'object',
              properties: { name: { type: 'string' } },
            },
            ProductDto: {
              type: 'object',
              properties: { title: { type: 'string' } },
            },
          },
        },
      };

      const result = applySchemaMetadata(document, [UserDto, ProductDto]);

      expect(result.components.schemas.UserDto.description).toBe('User data');
      expect(result.components.schemas.UserDto.example).toEqual({ name: 'John' });
      expect(result.components.schemas.ProductDto.description).toBe('Product data');
      expect(result.components.schemas.ProductDto.example).toEqual({ title: 'Widget' });
    });

    it('should handle missing schemas gracefully', () => {
      const UserSchema = arkWithMeta(
        type({ name: 'string' }),
        {
          description: 'User data',
        }
      );

      class UserDto extends createArkTypeDto(UserSchema) {}

      const document = {
        components: {
          schemas: {},
        },
      };

      // Should not throw
      expect(() => applySchemaMetadata(document, [UserDto])).not.toThrow();
    });

    it('should handle document without components', () => {
      const UserSchema = arkWithMeta(
        type({ name: 'string' }),
        {
          description: 'User data',
        }
      );

      class UserDto extends createArkTypeDto(UserSchema) {}

      const document = {};

      // Should not throw
      expect(() => applySchemaMetadata(document, [UserDto])).not.toThrow();
    });
  });
});
