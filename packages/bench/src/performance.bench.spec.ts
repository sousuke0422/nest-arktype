// SPDX-License-Identifier: MPL-2.0

import { describe, it, expect } from 'vitest';
import { type, Type } from 'arktype';
import { createArkTypeDto, arkWithMeta } from '../../core/src/arktype.helpers';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { IsString, IsEmail, IsNumber, IsOptional, Min } from 'class-validator';
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

// class-validatorとの比較用のDTO
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

// Zodスキーマ
const ZodUserSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  age: z.number().positive().optional(),
});

// nestjs-zod DTO
class NestJsZodUserDto extends createZodDto(ZodUserSchema) {}

// 素のArkTypeスキーマ（直接type()を使用）
const PlainArkTypeSchema = type({
  name: 'string',
  email: 'string.email',
  'age?': 'number>0',
});

// nestjs-arktype版のDTO（オーバーヘッドあり）
const NestJsArkTypeUserSchema = type({
  name: 'string',
  email: 'string.email',
  'age?': 'number>0',
});
const NestJsArkTypeUserDto = createArkTypeDto(NestJsArkTypeUserSchema);

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
    it('Plain ArkType: single valid object validation', () => {
      const start = performance.now();
      const result = PlainArkTypeSchema(validData);
      const end = performance.now();

      expect(result instanceof type.errors).toBe(false);
      const elapsed = end - start;
      console.log(`\n[Plain ArkType] Valid object: ${elapsed.toFixed(4)}ms`);
    });

    it('Plain ArkType: single invalid object validation', () => {
      const start = performance.now();
      const result = PlainArkTypeSchema(invalidData);
      const end = performance.now();

      expect(result instanceof type.errors).toBe(true);
      const elapsed = end - start;
      console.log(`[Plain ArkType] Invalid object: ${elapsed.toFixed(4)}ms`);
    });

    it('nestjs-arktype: single valid object validation', () => {
      const start = performance.now();
      const result = NestJsArkTypeUserSchema(validData);
      const end = performance.now();

      expect(result instanceof type.errors).toBe(false);
      const elapsed = end - start;
      console.log(`[nestjs-arktype] Valid object: ${elapsed.toFixed(4)}ms`);
    });

    it('nestjs-arktype: single invalid object validation', () => {
      const start = performance.now();
      const result = NestJsArkTypeUserSchema(invalidData);
      const end = performance.now();

      expect(result instanceof type.errors).toBe(true);
      const elapsed = end - start;
      console.log(`[nestjs-arktype] Invalid object: ${elapsed.toFixed(4)}ms`);
    });

    it('Zod: single valid object validation', () => {
      const start = performance.now();
      const result = ZodUserSchema.safeParse(validData);
      const end = performance.now();

      expect(result.success).toBe(true);
      const elapsed = end - start;
      console.log(`[Zod] Valid object: ${elapsed.toFixed(4)}ms`);
    });

    it('Zod: single invalid object validation', () => {
      const start = performance.now();
      const result = ZodUserSchema.safeParse(invalidData);
      const end = performance.now();

      expect(result.success).toBe(false);
      const elapsed = end - start;
      console.log(`[Zod] Invalid object: ${elapsed.toFixed(4)}ms`);
    });

    it('class-validator: single valid object validation', async () => {
      const instance = plainToInstance(ClassValidatorUserDto, validData);
      const start = performance.now();
      const errors = await validate(instance);
      const end = performance.now();

      expect(errors.length).toBe(0);
      const elapsed = end - start;
      console.log(`[class-validator] Valid object: ${elapsed.toFixed(4)}ms`);
    });

    it('class-validator: single invalid object validation', async () => {
      const instance = plainToInstance(ClassValidatorUserDto, invalidData);
      const start = performance.now();
      const errors = await validate(instance);
      const end = performance.now();

      expect(errors.length).toBeGreaterThan(0);
      const elapsed = end - start;
      console.log(`[class-validator] Invalid object: ${elapsed.toFixed(4)}ms`);
    });
  });

  describe('Bulk Validation Performance', () => {
    it('Plain ArkType: 1000 objects validation', () => {
      const start = performance.now();
      const results = largeDataset.map(data => PlainArkTypeSchema(data));
      const end = performance.now();

      const validCount = results.filter(r => !(r instanceof type.errors)).length;
      expect(validCount).toBe(1000);
      const elapsed = end - start;
      console.log(`\n[Plain ArkType] 1000 objects: ${elapsed.toFixed(2)}ms`);
      console.log(`  Average: ${(elapsed / 1000).toFixed(4)}ms per object`);
      console.log(`  Throughput: ${Math.round(1000 / (elapsed / 1000))} validations/sec`);
    });

    it('nestjs-arktype: 1000 objects validation', () => {
      const start = performance.now();
      const results = largeDataset.map(data => NestJsArkTypeUserSchema(data));
      const end = performance.now();

      const validCount = results.filter(r => !(r instanceof type.errors)).length;
      expect(validCount).toBe(1000);
      const elapsed = end - start;
      console.log(`\n[nestjs-arktype] 1000 objects: ${elapsed.toFixed(2)}ms`);
      console.log(`  Average: ${(elapsed / 1000).toFixed(4)}ms per object`);
      console.log(`  Throughput: ${Math.round(1000 / (elapsed / 1000))} validations/sec`);
    });

    it('Zod: 1000 objects validation', () => {
      const start = performance.now();
      const results = largeDataset.map(data => ZodUserSchema.safeParse(data));
      const end = performance.now();

      const validCount = results.filter(r => r.success).length;
      expect(validCount).toBe(1000);
      const elapsed = end - start;
      console.log(`\n[Zod] 1000 objects: ${elapsed.toFixed(2)}ms`);
      console.log(`  Average: ${(elapsed / 1000).toFixed(4)}ms per object`);
      console.log(`  Throughput: ${Math.round(1000 / (elapsed / 1000))} validations/sec`);
    });

    it('nestjs-zod: 1000 objects validation', () => {
      const start = performance.now();
      const results = largeDataset.map(data => ZodUserSchema.safeParse(data));
      const end = performance.now();

      const validCount = results.filter(r => r.success).length;
      expect(validCount).toBe(1000);
      const elapsed = end - start;
      console.log(`\n[nestjs-zod (Zod)] 1000 objects: ${elapsed.toFixed(2)}ms`);
      console.log(`  Average: ${(elapsed / 1000).toFixed(4)}ms per object`);
      console.log(`  Throughput: ${Math.round(1000 / (elapsed / 1000))} validations/sec`);
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
      const elapsed = end - start;
      console.log(`\n[class-validator] 1000 objects: ${elapsed.toFixed(2)}ms`);
      console.log(`  Average: ${(elapsed / 1000).toFixed(4)}ms per object`);
      console.log(`  Throughput: ${Math.round(1000 / (elapsed / 1000))} validations/sec`);
    });
  });

  describe('Schema Creation Performance', () => {
    it('Plain ArkType: schema creation', () => {
      const start = performance.now();
      for (let i = 0; i < 100; i++) {
        type({
          name: 'string',
          email: 'string.email',
          'age?': 'number>0',
        });
      }
      const end = performance.now();

      const elapsed = end - start;
      console.log(`\n[Plain ArkType] Schema creation (100x): ${elapsed.toFixed(2)}ms`);
      console.log(`  Average: ${(elapsed / 100).toFixed(4)}ms per schema`);
    });


    it('Zod: schema creation', () => {
      const start = performance.now();
      for (let i = 0; i < 100; i++) {
        z.object({
          name: z.string(),
          email: z.string().email(),
          age: z.number().positive().optional(),
        });
      }
      const end = performance.now();

      const elapsed = end - start;
      console.log(`\n[Zod] Schema creation (100x): ${elapsed.toFixed(2)}ms`);
      console.log(`  Average: ${(elapsed / 100).toFixed(4)}ms per schema`);
    });

    it('nestjs-arktype: DTO class creation (includes overhead)', () => {
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

      const elapsed = end - start;
      console.log(`\n[nestjs-arktype] DTO creation (100x): ${elapsed.toFixed(2)}ms`);
      console.log(`  Average: ${(elapsed / 100).toFixed(4)}ms per DTO`);
      console.log(`  Note: This includes createArkTypeDto overhead`);
    });

    it('nestjs-zod: DTO class creation', () => {
      const schema = z.object({
        name: z.string(),
        email: z.string().email(),
        age: z.number().positive().optional(),
      });

      const start = performance.now();
      for (let i = 0; i < 100; i++) {
        createZodDto(schema);
      }
      const end = performance.now();

      const elapsed = end - start;
      console.log(`\n[nestjs-zod] DTO creation (100x): ${elapsed.toFixed(2)}ms`);
      console.log(`  Average: ${(elapsed / 100).toFixed(4)}ms per DTO`);
    });
  });

  describe('Complex Schema Performance', () => {
    // 素のArkTypeスキーマ
    const PlainComplexSchema = type({
      id: 'string',
      name: 'string',
      email: 'string.email',
      'age?': 'number>0',
      status: "'active' | 'inactive' | 'pending'",
      tags: 'string[]',
      'createdAt?': 'string.date.parse',
      'metadata?': 'string | null',
    });

    // nestjs-arktype版（メタデータ付き）
    const NestJsComplexSchema = arkWithMeta(
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

    it('Plain ArkType: complex schema validation', () => {
      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        PlainComplexSchema(complexValidData);
      }
      const end = performance.now();

      const elapsed = end - start;
      console.log(`[Plain ArkType] Complex schema (1000 validations): ${elapsed.toFixed(2)}ms`);
      console.log(`  Average: ${(elapsed / 1000).toFixed(4)}ms per validation`);
    });

    it('nestjs-arktype: complex schema validation', () => {
      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        NestJsComplexSchema(complexValidData);
      }
      const end = performance.now();

      const elapsed = end - start;
      console.log(`[nestjs-arktype] Complex schema (1000 validations): ${elapsed.toFixed(2)}ms`);
      console.log(`  Average: ${(elapsed / 1000).toFixed(4)}ms per validation`);
    });

    it('nestjs-arktype: metadata generation (OpenAPI)', () => {
      const ComplexDto = createArkTypeDto(NestJsComplexSchema);
      
      const start = performance.now();
      const metadata = ComplexDto._OPENAPI_METADATA_FACTORY();
      const end = performance.now();

      expect(metadata).toBeDefined();
      const elapsed = end - start;
      console.log(`[nestjs-arktype] Metadata generation: ${elapsed.toFixed(4)}ms`);
      console.log(`  Note: This is the overhead for OpenAPI integration`);
    });
  });

  describe('Memory Usage Estimation', () => {
    it('Plain ArkType: estimate memory usage for schemas', () => {
      const schemas: Type[] = [];
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

      const elapsed = end - start;
      console.log(`[Plain ArkType] Created ${iterations} schemas in ${elapsed.toFixed(2)}ms`);
      console.log(`  Average: ${(elapsed / iterations).toFixed(4)}ms per schema`);
    });

    it('nestjs-arktype: estimate memory usage for schemas', () => {
      const schemas: Type[] = [];
      const iterations = 1000;

      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        const schema = type({
          name: 'string',
          email: 'string.email',
          'age?': 'number>0',
        });
        createArkTypeDto(schema); // DTO作成も含める
        schemas.push(schema);
      }
      const end = performance.now();

      const elapsed = end - start;
      console.log(`[nestjs-arktype] Created ${iterations} schemas + DTOs in ${elapsed.toFixed(2)}ms`);
      console.log(`  Average: ${(elapsed / iterations).toFixed(4)}ms per schema+DTO`);
    });
  });

});

