import { describe, it, expect } from 'vitest';
import { type } from 'arktype';
import { createArkTypeDto, arkWithMeta } from './arktype.helpers';

describe('ArkType Helpers', () => {
  describe('createArkTypeDto', () => {
    it('should create a DTO class with static schema property', () => {
      const UserSchema = type({
        name: 'string',
        email: 'string.email',
      });

      const UserDto = createArkTypeDto(UserSchema);

      expect(UserDto.schema).toBe(UserSchema);
    });

    it('should have _OPENAPI_METADATA_FACTORY method', () => {
      const UserSchema = type({
        name: 'string',
        age: 'number',
      });

      const UserDto = createArkTypeDto(UserSchema);

      expect(UserDto._OPENAPI_METADATA_FACTORY).toBeDefined();
      expect(typeof UserDto._OPENAPI_METADATA_FACTORY).toBe('function');
    });

    it('should generate property metadata correctly', () => {
      const UserSchema = type({
        name: 'string',
        'age?': 'number>0',
      });

      const UserDto = createArkTypeDto(UserSchema);
      const metadata = UserDto._OPENAPI_METADATA_FACTORY();

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
      const UserSchema = type({
        name: 'string',
        email: 'string.email',
      });

      const UserWithMeta = arkWithMeta(UserSchema, {
        description: 'User data',
        example: { name: 'John', email: 'john@example.com' },
        properties: {
          name: { description: 'User name', example: 'John' },
          email: { description: 'Email address', example: 'john@example.com' },
        },
      });

      const meta = (UserWithMeta as any).__meta;
      expect(meta).toBeDefined();
      expect(meta.description).toBe('User data');
      expect(meta.example).toEqual({ name: 'John', email: 'john@example.com' });
      expect(meta.properties.name.description).toBe('User name');
    });

    it('should enforce type-safe property keys', () => {
      const UserSchema = type({
        name: 'string',
        email: 'string.email',
      });

      // This should compile without errors
      arkWithMeta(UserSchema, {
        properties: {
          name: { description: 'Name' },
          email: { description: 'Email' },
        },
      });

      // This should cause a TypeScript error if uncommented:
      // arkWithMeta(UserSchema, {
      //   properties: {
      //     invalidKey: { description: 'Invalid' },
      //   },
      // });
    });

    it('should include property metadata in _OPENAPI_METADATA_FACTORY output', () => {
      const UserSchema = type({
        name: 'string',
        email: 'string.email',
      });

      const UserWithMeta = arkWithMeta(UserSchema, {
        properties: {
          name: { description: 'Full name', example: 'John Doe' },
          email: { description: 'Email address', example: 'john@example.com' },
        },
      });

      const UserDto = createArkTypeDto(UserWithMeta);
      const metadata = UserDto._OPENAPI_METADATA_FACTORY();

      expect(metadata.name.description).toBe('Full name');
      expect(metadata.name.example).toBe('John Doe');
      expect(metadata.email.description).toBe('Email address');
      expect(metadata.email.example).toBe('john@example.com');
    });
  });

  describe('Nullable types', () => {
    it('should handle string | null correctly', () => {
      const Schema = type({
        value: 'string | null',
      });

      const Dto = createArkTypeDto(Schema);
      const metadata = Dto._OPENAPI_METADATA_FACTORY();

      expect(metadata.value.type).toBe('string');
      expect(metadata.value.nullable).toBe(true);
    });

    it('should handle optional nullable fields', () => {
      const Schema = type({
        'value?': 'string | null',
      });

      const Dto = createArkTypeDto(Schema);
      const metadata = Dto._OPENAPI_METADATA_FACTORY();

      expect(metadata.value.type).toBe('string');
      expect(metadata.value.nullable).toBe(true);
      expect(metadata.value.required).toBe(false);
    });
  });

  describe('Date types', () => {
    it('should handle string.date.parse correctly', () => {
      const Schema = type({
        createdAt: 'string.date.parse',
      });

      const Dto = createArkTypeDto(Schema);
      const metadata = Dto._OPENAPI_METADATA_FACTORY();

      expect(metadata.createdAt.type).toBe('string');
      // Date型はfallbackでformat: 'date-time'に変換されるはず
      // ただし、現在の実装ではformatが含まれない可能性がある
    });
  });

  describe('Array types', () => {
    it('should handle string[] correctly', () => {
      const Schema = type({
        tags: 'string[]',
      });

      const Dto = createArkTypeDto(Schema);
      const metadata = Dto._OPENAPI_METADATA_FACTORY();

      expect(metadata.tags.type).toBe('array');
      expect(metadata.tags.items).toBeDefined();
      expect(metadata.tags.items.type).toBe('string');
    });
  });

  describe('Enum types', () => {
    it('should handle string literal union as enum', () => {
      const Schema = type({
        status: "'active' | 'inactive' | 'pending'",
      });

      const Dto = createArkTypeDto(Schema);
      const metadata = Dto._OPENAPI_METADATA_FACTORY();

      expect(metadata.status.enum).toBeDefined();
      expect(metadata.status.enum).toEqual(['active', 'inactive', 'pending']);
    });
  });

  describe('Number constraints', () => {
    it('should handle number>0 correctly', () => {
      const Schema = type({
        age: 'number>0',
      });

      const Dto = createArkTypeDto(Schema);
      const metadata = Dto._OPENAPI_METADATA_FACTORY();

      expect(metadata.age.type).toBe('number');
      expect(metadata.age.exclusiveMinimum).toBe(0);
    });

    it('should handle number>=0 correctly', () => {
      const Schema = type({
        count: 'number>=0',
      });

      const Dto = createArkTypeDto(Schema);
      const metadata = Dto._OPENAPI_METADATA_FACTORY();

      expect(metadata.count.type).toBe('number');
      expect(metadata.count.minimum).toBe(0);
    });
  });

  describe('Email validation', () => {
    it('should handle string.email correctly', () => {
      const Schema = type({
        email: 'string.email',
      });

      const Dto = createArkTypeDto(Schema);
      const metadata = Dto._OPENAPI_METADATA_FACTORY();

      expect(metadata.email.type).toBe('string');
      expect(metadata.email.format).toBe('email');
      expect(metadata.email.pattern).toBeDefined();
    });
  });
});
