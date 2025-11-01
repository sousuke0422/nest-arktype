import { type } from 'arktype';
import { createArkTypeDto, arkWithMeta } from './arktype.helpers';

// テスト1: 基本的なスキーマ
const UserSchemaDefinition = type({
  name: 'string',
  email: 'string.email',
  'age?': 'number>0',
});

export class CreateUserDto extends createArkTypeDto(UserSchemaDefinition) {}

// テスト2: メタデータ付きスキーマ
const ProductSchemaDefinition = type({
  name: 'string',
  price: 'number>0',
  'description?': 'string',
});

const ProductSchema = arkWithMeta(ProductSchemaDefinition, {
  example: {
    name: 'Sample Product',
    price: 99.99,
    description: 'A great product',
  },
});

export class CreateProductDto extends createArkTypeDto(ProductSchema) {}

// テスト3: 複雑な型（ユニオン、オプショナル、nullable）
const ComplexSchemaDefinition = type({
  status: "'active' | 'inactive' | 'pending'",
  'tags?': 'string[]',
  metadata: 'string | null',
  count: 'number>=0',
});

export class ComplexDto extends createArkTypeDto(ComplexSchemaDefinition) {}

// テスト4: Date型の処理（HTTP経由では文字列で送られる）
const EventSchemaDefinition = type({
  title: 'string',
  startDate: 'string.date.parse', // ISO 8601文字列をDateに変換
  'endDate?': 'string.date.parse',
});

export class CreateEventDto extends createArkTypeDto(EventSchemaDefinition) {}
