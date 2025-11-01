import { type } from 'arktype';
import { createArkTypeDto, arkWithMeta } from './arktype.helpers';

// テスト1: メタデータ付きスキーマ（プロパティレベルのdescriptionとexample）
const UserSchemaDefinition = type({
  name: 'string',
  email: 'string.email',
  'age?': 'number>0',
});

const UserSchema = arkWithMeta(UserSchemaDefinition, {
  description: 'User creation data',
  example: {
    name: 'John Doe',
    email: 'john.doe@example.com',
    age: 30
  },
  properties: {
    name: {
      description: 'Full name of the user',
      example: 'John Doe'
    },
    email: {
      description: 'Email address of the user',
      example: 'john.doe@example.com'
    },
    age: {
      description: 'Age of the user (optional)',
      example: 30
    }
  }
});

export class CreateUserDto extends createArkTypeDto(UserSchema) {}

// テスト2: メタデータ付きスキーマ（deprecatedとexternalDocsの例）
const ProductSchemaDefinition = type({
  name: 'string',
  price: 'number>0',
  'description?': 'string',
});

const ProductSchema = arkWithMeta(ProductSchemaDefinition, {
  description: 'Product creation data',
  example: {
    name: 'Sample Product',
    price: 99.99,
    description: 'A great product',
  },
  properties: {
    name: {
      description: 'Product name',
      example: 'Premium Widget'
    },
    price: {
      description: 'Product price in USD',
      example: 99.99
    },
    description: {
      description: 'Detailed product description',
      example: 'A high-quality widget that does amazing things',
      deprecated: false
    }
  }
});

export class CreateProductDto extends createArkTypeDto(ProductSchema) {}

// テスト3: 複雑な型（ユニオン、オプショナル、nullable）
const ComplexSchemaDefinition = type({
  status: "'active' | 'inactive' | 'pending'",
  'tags?': 'string[]',
  count: 'number>=0',
});

export class ComplexDto extends createArkTypeDto(ComplexSchemaDefinition) {}

// テスト5: Nullable型のテスト（union with null）
const NullableSchemaDefinition = type({
  name: 'string',
  'description?': 'string | null', // オプショナルかつnullable
  metadata: 'string | null', // 必須だがnullable
});

export class NullableDto extends createArkTypeDto(NullableSchemaDefinition) {}

// テスト6: 複雑なUnion型（異なる型のユニオン）
// NOTE: NestJS Swaggerは anyOf 形式のスキーマを正しく処理できず、
//       循環依存エラーを引き起こすため、現時点では使用不可
// 
// const MixedUnionSchemaDefinition = type({
//   value: 'string | number', // 文字列または数値
//   'optionalUnion?': 'boolean | string', // オプショナルなユニオン
// });
// 
// const MixedUnionSchema = arkWithMeta(MixedUnionSchemaDefinition, {
//   description: 'Mixed union types test',
//   example: {
//     value: 'test',
//     optionalUnion: true
//   },
//   properties: {
//     value: {
//       description: 'Can be either a string or a number',
//       example: 'sample text'
//     },
//     optionalUnion: {
//       description: 'Optional field with union type',
//       example: false
//     }
//   }
// });
// 
// export class MixedUnionDto extends createArkTypeDto(MixedUnionSchema) {}

// テスト4: Date型の処理（HTTP経由では文字列で送られる）
const EventSchemaDefinition = type({
  title: 'string',
  startDate: 'string.date.parse', // ISO 8601文字列をDateに変換
  'endDate?': 'string.date.parse',
});

const EventSchema = arkWithMeta(EventSchemaDefinition, {
  description: 'Event creation data',
  example: {
    title: 'Tech Conference 2025',
    startDate: '2025-12-01T09:00:00Z',
    endDate: '2025-12-03T17:00:00Z'
  },
  properties: {
    title: {
      description: 'Event title',
      example: 'Tech Conference 2025'
    },
    startDate: {
      description: 'Event start date and time (ISO 8601)',
      example: '2025-12-01T09:00:00Z'
    },
    endDate: {
      description: 'Event end date and time (ISO 8601, optional)',
      example: '2025-12-03T17:00:00Z'
    }
  }
});

export class CreateEventDto extends createArkTypeDto(EventSchema) {}
