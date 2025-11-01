import { describe, it, expect, beforeAll } from 'vitest';
import { type } from 'arktype';
import { createArkTypeDto, arkWithMeta } from './arktype.helpers';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

// class-validatorとの比較用のDTO
import { IsString, IsEmail, IsNumber, IsOptional, Min } from 'class-validator';

class ClassValidatorUserDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  age?: number;
}

// ArkType版のDTO
const ArkTypeUserSchema = type({
  name: 'string',
  email: 'string.email',
  'age?': 'number>0',
});
const ArkTypeUserDto = createArkTypeDto(ArkTypeUserSchema);

describe('Performance Benchmarks', () => {
  const validData = {
    name: 'John Doe',
    email: 'john@example.com',
    age: 30,
  };

  const invalidData = {
    name: 123, // should be string
    email: 'invalid-email',
    age: -5,
  };

  const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
    name: `User ${i}`,
    email: `user${i}@example.com`,
    age: 20 + (i % 50),
  }));

  describe('Validation Performance', () => {
    it('ArkType: single valid object validation', () => {
      const start = performance.now();
      const result = ArkTypeUserSchema(validData);
      const end = performance.now();

      expect(result instanceof type.errors).toBe(false);
      console.log(`ArkType (valid): ${(end - start).toFixed(4)}ms`);
    });

    it('ArkType: single invalid object validation', () => {
      const start = performance.now();
      const result = ArkTypeUserSchema(invalidData);
      const end = performance.now();

      expect(result instanceof type.errors).toBe(true);
      console.log(`ArkType (invalid): ${(end - start).toFixed(4)}ms`);
    });

    it('class-validator: single valid object validation', async () => {
      const instance = plainToInstance(ClassValidatorUserDto, validData);
      const start = performance.now();
      const errors = await validate(instance);
      const end = performance.now();

      expect(errors.length).toBe(0);
      console.log(`class-validator (valid): ${(end - start).toFixed(4)}ms`);
    });

    it('class-validator: single invalid object validation', async () => {
      const instance = plainToInstance(ClassValidatorUserDto, invalidData);
      const start = performance.now();
      const errors = await validate(instance);
      const end = performance.now();

      expect(errors.length).toBeGreaterThan(0);
      console.log(`class-validator (invalid): ${(end - start).toFixed(4)}ms`);
    });
  });

  describe('Bulk Validation Performance', () => {
    it('ArkType: 1000 objects validation', () => {
      const start = performance.now();
      const results = largeDataset.map(data => ArkTypeUserSchema(data));
      const end = performance.now();

      const validCount = results.filter(r => !(r instanceof type.errors)).length;
      expect(validCount).toBe(1000);
      console.log(`ArkType (1000 objects): ${(end - start).toFixed(2)}ms`);
      console.log(`  Average: ${((end - start) / 1000).toFixed(4)}ms per object`);
    });

    it('class-validator: 1000 objects validation', async () => {
      const start = performance.now();
      const validationPromises = largeDataset.map(async data => {
        const instance = plainToInstance(ClassValidatorUserDto, data);
        return await validate(instance);
      });
      const results = await Promise.all(validationPromises);
      const end = performance.now();

      const validCount = results.filter(errors => errors.length === 0).length;
      expect(validCount).toBe(1000);
      console.log(`class-validator (1000 objects): ${(end - start).toFixed(2)}ms`);
      console.log(`  Average: ${((end - start) / 1000).toFixed(4)}ms per object`);
    });
  });

  describe('Schema Creation Performance', () => {
    it('ArkType: schema creation', () => {
      const start = performance.now();
      for (let i = 0; i < 100; i++) {
        type({
          name: 'string',
          email: 'string.email',
          'age?': 'number>0',
        });
      }
      const end = performance.now();

      console.log(`ArkType schema creation (100x): ${(end - start).toFixed(2)}ms`);
      console.log(`  Average: ${((end - start) / 100).toFixed(4)}ms per schema`);
    });

    it('ArkType: DTO class creation', () => {
      const schema = type({
        name: 'string',
        email: 'string.email',
        'age?': 'number>0',
      });

      const start = performance.now();
      for (let i = 0; i < 100; i++) {
        createArkTypeDto(schema);
      }
      const end = performance.now();

      console.log(`ArkType DTO creation (100x): ${(end - start).toFixed(2)}ms`);
      console.log(`  Average: ${((end - start) / 100).toFixed(4)}ms per DTO`);
    });
  });

  describe('Complex Schema Performance', () => {
    const ComplexSchema = arkWithMeta(
      type({
        id: 'string',
        name: 'string',
        email: 'string.email',
        'age?': 'number>0',
        status: "'active' | 'inactive' | 'pending'",
        tags: 'string[]',
        'createdAt?': 'string.date.parse',
        'metadata?': 'string | null',
      }),
      {
        description: 'Complex user schema',
        example: {
          id: '123',
          name: 'John Doe',
          email: 'john@example.com',
          age: 30,
          status: 'active',
          tags: ['user', 'premium'],
          createdAt: '2025-01-01T00:00:00Z',
        },
        properties: {
          id: { description: 'User ID' },
          name: { description: 'User name' },
          email: { description: 'Email address' },
          age: { description: 'Age' },
          status: { description: 'Account status' },
          tags: { description: 'User tags' },
          createdAt: { description: 'Creation date' },
        },
      }
    );

    const complexValidData = {
      id: '123',
      name: 'John Doe',
      email: 'john@example.com',
      age: 30,
      status: 'active',
      tags: ['user', 'premium'],
      createdAt: '2025-01-01T00:00:00Z',
    };

    it('Complex schema validation', () => {
      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        ComplexSchema(complexValidData);
      }
      const end = performance.now();

      console.log(`Complex schema (1000 validations): ${(end - start).toFixed(2)}ms`);
      console.log(`  Average: ${((end - start) / 1000).toFixed(4)}ms per validation`);
    });

    it('Complex schema with metadata', () => {
      const ComplexDto = createArkTypeDto(ComplexSchema);
      
      const start = performance.now();
      const metadata = ComplexDto._OPENAPI_METADATA_FACTORY();
      const end = performance.now();

      expect(metadata).toBeDefined();
      console.log(`Metadata generation: ${(end - start).toFixed(4)}ms`);
    });
  });

  describe('Memory Usage Estimation', () => {
    it('should estimate memory usage for schemas', () => {
      const schemas = [];
      const iterations = 1000;

      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        schemas.push(type({
          name: 'string',
          email: 'string.email',
          'age?': 'number>0',
        }));
      }
      const end = performance.now();

      console.log(`Created ${iterations} schemas in ${(end - start).toFixed(2)}ms`);
      console.log(`  Average: ${((end - start) / iterations).toFixed(4)}ms per schema`);
    });
  });
});
