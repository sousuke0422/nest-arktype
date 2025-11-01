import { type } from 'arktype';
import { createArkTypeDto, arkWithMeta } from './arktype.helpers';

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
