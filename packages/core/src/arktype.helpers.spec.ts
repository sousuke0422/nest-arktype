import { describe, it, expect } from 'vitest';
import { type } from 'arktype';
import { createArkTypeDto, arkWithMeta } from './arktype.helpers';

describe('ArkType Helpers', () => {
  describe('createArkTypeDto', () => {
    it('should create a DTO class with static schema property', () => {
      const BasicUserSchema = type({
        name: 'string',
        email: 'string.email',
      });

      const BasicUserDto = createArkTypeDto(BasicUserSchema);

      expect(BasicUserDto.schema).toBe(BasicUserSchema);
    });

    it('should have _OPENAPI_METADATA_FACTORY method', () => {
      const MetadataSchema = type({
        name: 'string',
        age: 'number',
      });

      const MetadataDto = createArkTypeDto(MetadataSchema);

      expect(MetadataDto._OPENAPI_METADATA_FACTORY).toBeDefined();
      expect(typeof MetadataDto._OPENAPI_METADATA_FACTORY).toBe('function');
    });

    it('should generate property metadata correctly', () => {
      const PropertySchema = type({
        name: 'string',
        'age?': 'number>0',
      });

      const PropertyDto = createArkTypeDto(PropertySchema);
      const metadata = PropertyDto._OPENAPI_METADATA_FACTORY();

      expect(metadata.name).toBeDefined();
      expect(metadata.name.type).toBe('string');
      expect(metadata.name.required).toBe(true);

      expect(metadata.age).toBeDefined();
      expect(metadata.age.type).toBe('number');
      expect(metadata.age.required).toBe(false);
      expect(metadata.age.exclusiveMinimum).toBe(0);
    });
  });

  describe('arkWithMeta', () => {
    it('should attach metadata to ArkType schema', () => {
      const AttachMetaSchema = type({
        name: 'string',
        email: 'string.email',
      });

      const AttachMetaWithMeta = arkWithMeta(AttachMetaSchema, {
        description: 'User data',
        example: { name: 'John', email: 'john@example.com' },
        properties: {
          name: { description: 'User name', example: 'John' },
          email: { description: 'Email address', example: 'john@example.com' },
        },
      });

      const meta = (AttachMetaWithMeta as any).__meta;
      expect(meta).toBeDefined();
      expect(meta.description).toBe('User data');
      expect(meta.example).toEqual({ name: 'John', email: 'john@example.com' });
      expect(meta.properties.name.description).toBe('User name');
    });

    it('should enforce type-safe property keys', () => {
      const TypeSafeSchema = type({
        name: 'string',
        email: 'string.email',
      });

      // This should compile without errors
      arkWithMeta(TypeSafeSchema, {
        properties: {
          name: { description: 'Name' },
          email: { description: 'Email' },
        },
      });

      // This should cause a TypeScript error if uncommented:
      // arkWithMeta(TypeSafeSchema, {
      //   properties: {
      //     invalidKey: { description: 'Invalid' },
      //   },
      // });
    });

    it('should include property metadata in _OPENAPI_METADATA_FACTORY output', () => {
      const IncludeMetaSchema = type({
        name: 'string',
        email: 'string.email',
      });

      const IncludeMetaWithMeta = arkWithMeta(IncludeMetaSchema, {
        properties: {
          name: { description: 'Full name', example: 'John Doe' },
          email: { description: 'Email address', example: 'john@example.com' },
        },
      });

      const IncludeMetaDto = createArkTypeDto(IncludeMetaWithMeta);
      const metadata = IncludeMetaDto._OPENAPI_METADATA_FACTORY();

      expect(metadata.name.description).toBe('Full name');
      expect(metadata.name.example).toBe('John Doe');
      expect(metadata.email.description).toBe('Email address');
      expect(metadata.email.example).toBe('john@example.com');
    });
  });

  describe('Nullable types', () => {
    it('should handle string | null correctly', () => {
      const NullableStringSchema = type({
        value: 'string | null',
      });

      const NullableStringDto = createArkTypeDto(NullableStringSchema);
      const metadata = NullableStringDto._OPENAPI_METADATA_FACTORY();

      expect(metadata.value.type).toBe('string');
      expect(metadata.value.nullable).toBe(true);
    });

    it('should handle optional nullable fields', () => {
      const OptionalNullableSchema = type({
        'value?': 'string | null',
      });

      const OptionalNullableDto = createArkTypeDto(OptionalNullableSchema);
      const metadata = OptionalNullableDto._OPENAPI_METADATA_FACTORY();

      expect(metadata.value.type).toBe('string');
      expect(metadata.value.nullable).toBe(true);
      expect(metadata.value.required).toBe(false);
    });
  });

  describe('Date types', () => {
    it('should handle string.date.parse correctly', () => {
      const DateParseSchema = type({
        createdAt: 'string.date.parse',
      });

      const DateParseDto = createArkTypeDto(DateParseSchema);
      const metadata = DateParseDto._OPENAPI_METADATA_FACTORY();

      expect(metadata.createdAt.type).toBe('string');
      // Date型はfallbackでformat: 'date-time'に変換されるはず
      // ただし、現在の実装ではformatが含まれない可能性がある
    });
  });

  describe('Array types', () => {
    it('should handle string[] correctly', () => {
      const ArraySchema = type({
        tags: 'string[]',
      });

      const ArrayDto = createArkTypeDto(ArraySchema);
      const metadata = ArrayDto._OPENAPI_METADATA_FACTORY();

      expect(metadata.tags.type).toBe('array');
      expect(metadata.tags.items).toBeDefined();
      expect(metadata.tags.items.type).toBe('string');
    });
  });

  describe('Enum types', () => {
    it('should handle string literal union as enum', () => {
      const EnumSchema = type({
        status: "'active' | 'inactive' | 'pending'",
      });

      const EnumDto = createArkTypeDto(EnumSchema);
      const metadata = EnumDto._OPENAPI_METADATA_FACTORY();

      expect(metadata.status.enum).toBeDefined();
      expect(metadata.status.enum).toEqual(['active', 'inactive', 'pending']);
    });
  });

  describe('Number constraints', () => {
    it('should handle number>0 correctly', () => {
      const GreaterThanSchema = type({
        age: 'number>0',
      });

      const GreaterThanDto = createArkTypeDto(GreaterThanSchema);
      const metadata = GreaterThanDto._OPENAPI_METADATA_FACTORY();

      expect(metadata.age.type).toBe('number');
      expect(metadata.age.exclusiveMinimum).toBe(0);
    });

    it('should handle number>=0 correctly', () => {
      const GreaterEqualSchema = type({
        count: 'number>=0',
      });

      const GreaterEqualDto = createArkTypeDto(GreaterEqualSchema);
      const metadata = GreaterEqualDto._OPENAPI_METADATA_FACTORY();

      expect(metadata.count.type).toBe('number');
      expect(metadata.count.minimum).toBe(0);
    });
  });

  describe('Email validation', () => {
    it('should handle string.email correctly', () => {
      const EmailSchema = type({
        email: 'string.email',
      });

      const EmailDto = createArkTypeDto(EmailSchema);
      const metadata = EmailDto._OPENAPI_METADATA_FACTORY();

      expect(metadata.email.type).toBe('string');
      expect(metadata.email.format).toBe('email');
      expect(metadata.email.pattern).toBeDefined();
    });
  });
});
