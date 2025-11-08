// SPDX-License-Identifier: MPL-2.0

import { type } from 'arktype';
import { createArkTypeDto, arkWithMeta } from 'nestjs-arktype';

// プロパティレベルでdescriptionとexampleを付与する方法のテスト
const UserSchemaDefinition = type({
  name: 'string',
  email: 'string.email',
  'age?': 'number>0',
});

// DTO全体のメタデータ
const UserSchemaWithMeta = arkWithMeta(UserSchemaDefinition, {
  // スキーマ全体のサンプル（これは動作するかテスト）
  example: {
    name: 'John Doe',
    email: 'john.doe@example.com',
    age: 30
  }
});

export class TestUserDto extends createArkTypeDto(UserSchemaWithMeta) {}

