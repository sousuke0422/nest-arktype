# OpenAPIメタデータ（example, description）のサポート状況

**検証日時**: 2025-11-02  
**質問**: OpenAPIでサンプル（example）、プロパティの説明（description）を実現できているか？

---

## 結論

**❌ 現時点では完全にはサポートされていません**

ただし、以下の部分的なサポートは可能です：

### ✅ サポート済み
1. **スキーマレベルのdescription** - ArkTypeの`.describe()`メソッドで可能（ただし実装が必要）
2. **型情報の自動生成** - `type`, `format`, `pattern`, `minimum`などは正常に生成
3. **required配列** - 必須フィールドが正しく識別される

### ❌ 未サポート
1. **プロパティレベルのdescription** - 各フィールドの説明
2. **プロパティレベルのexample** - 各フィールドのサンプル値
3. **スキーマレベルのexample** - DTO全体のサンプルオブジェクト

---

## 技術的な理由

### `_OPENAPI_METADATA_FACTORY`の制約

NestJS Swaggerの`_OPENAPI_METADATA_FACTORY`は以下の形式を期待します:

```typescript
{
  "propertyName": {
    "type": "string",
    "required": true,
    "description": "...", // ← これは動作しない
    "example": "..."      // ← これも動作しない
  }
}
```

**問題**: 返されたオブジェクトの各キー（`propertyName`）は**DTOのプロパティ**として解釈されます。そのため、`description`や`example`をプロパティとして返すと、それらが実際のDTOフィールドとして誤認され、循環依存エラーが発生します。

### 実際のエラー

```
Error: A circular dependency has been detected (property key: "description").
```

---

## `@nestjs/zod`での状況

`@nestjs/zod`でも同様の制限があります。

### Zodの場合

```typescript
const UserSchema = z.object({
  name: z.string().describe('User name'), // ← これは反映されない
  email: z.string().email()
});
```

**結果**: Zodの`.describe()`メソッドで付与した説明は、`_OPENAPI_METADATA_FACTORY`経由では**OpenAPIスキーマに反映されません**。

### 解決策 (Zodの場合)

`@wahyubucil/nestjs-zod-openapi`パッケージは、`.openapi()`という拡張メソッドを提供:

```typescript
import { extendApi } from '@wahyubucil/nestjs-zod-openapi';

const UserSchema = extendApi(
  z.object({
    name: z.string(),
    email: z.string().email()
  }),
  {
    description: 'User creation data',
    example: { name: 'John', email: 'john@example.com' }
  }
);
```

これは**Zodスキーマを拡張**して、メタデータを別の場所に保存し、カスタムの変換ロジックで処理します。

---

## ArkTypeでの実装可能なアプローチ

### アプローチ1: プロパティごとのメタデータヘルパー (複雑)

```typescript
const UserSchema = type({
  name: arkProp('string', { description: 'User name', example: 'John' }),
  email: arkProp('string.email', { description: 'Email address' }),
});

function arkProp(typeDef: string, meta: { description?: string; example?: any }) {
  const t = type(typeDef);
  (t as any).__propMeta = meta;
  return t;
}
```

**課題**: ArkTypeのオブジェクト型定義はネストされた構造なため、個々のプロパティにメタデータをアタッチする標準的な方法がない。

### アプローチ2: 外部マッピング (実装可能)

```typescript
const UserSchema = type({
  name: 'string',
  email: 'string.email',
});

const UserSchemaMeta = {
  properties: {
    name: { description: 'User name', example: 'John' },
    email: { description: 'Email address', example: 'john@example.com' }
  },
  example: {
    name: 'John Doe',
    email: 'john.doe@example.com'
  }
};

const UserSchemaWithMeta = arkWithMeta(UserSchema, UserSchemaMeta);
```

`arkTypeToApiMetadata`関数を拡張して、このメタデータをOpenAPIスキーマにマージする。

**実装の複雑さ**: 中程度

### アプローチ3: デコレータとの併用 (推奨)

```typescript
export class CreateUserDto extends createArkTypeDto(UserSchema) {
  @ApiProperty({ description: 'User name', example: 'John Doe' })
  name!: string;

  @ApiProperty({ description: 'Email address', example: 'john@example.com' })
  email!: string;
}
```

**メリット**:
- NestJSの標準的なアプローチ
- IDEの補完が効く
- 既存のツールとの互換性が高い

**デメリット**:
- ArkTypeスキーマと重複してメタデータを定義する必要がある
- Single Source of Truthの原則に反する

---

## 推奨される実装計画

### 短期（即座に実装可能）

**アプローチ3を採用**: デコレータとの併用

```typescript
// 1. ArkTypeスキーマで型とバリデーションを定義
const UserSchemaDefinition = type({
  name: 'string',
  email: 'string.email',
  'age?': 'number>0',
});

// 2. createArkTypeDtoでベースクラスを生成
class UserDtoBase extends createArkTypeDto(UserSchemaDefinition) {}

// 3. メタデータをデコレータで追加
export class CreateUserDto extends UserDtoBase {
  @ApiProperty({ description: 'User name', example: 'John Doe' })
  name!: string;

  @ApiProperty({ description: 'Email address', example: 'john@example.com' })
  email!: string;

  @ApiProperty({ description: 'Age', example: 30, required: false })
  age?: number;
}
```

**評価**: ⭐⭐⭐⭐☆
- ✅ 即座に動作する
- ✅ 完全なOpenAPI生成
- ⚠️ 若干の重複

### 中期（1-2週間）

**アプローチ2を実装**: 外部マッピング

```typescript
const UserSchema = type({
  name: 'string',
  email: 'string.email',
  'age?': 'number>0',
});

const UserMeta = {
  name: { description: 'User name', example: 'John Doe' },
  email: { description: 'Email address', example: 'john@example.com' },
  age: { description: 'Age', example: 30 }
};

export class CreateUserDto extends createArkTypeDto(UserSchema, UserMeta) {}
```

`createArkTypeDto`を拡張して、第2引数のメタデータを処理する。

**評価**: ⭐⭐⭐⭐⭐
- ✅ Single Source of Truth
- ✅ 型安全
- ⚠️ 実装が必要

### 長期（1ヶ月以上）

**ArkTypeへのコントリビュート**: ネイティブなメタデータAPI

ArkTypeに以下のようなAPIを提案:

```typescript
const UserSchema = type({
  name: type('string').meta({ description: 'User name', example: 'John' }),
  email: type('string.email').meta({ description: 'Email' }),
});
```

---

## 現時点の推奨

### プロトタイプ・MVP

**アプローチ3（デコレータ併用）を採用**

理由:
- すぐに動作する
- 学習コストが低い
- 既存のNestJSプロジェクトとの整合性が高い

### 本格的な導入

**アプローチ2（外部マッピング）を実装**

理由:
- Single Source of Truthを維持
- TypeScriptの型推論が効く
- メンテナンス性が高い

---

## 次のステップ

1. [ ] アプローチ2の実装プロトタイプ作成
2. [ ] 実装の複雑さを評価
3. [ ] パフォーマンスへの影響を測定
4. [ ] 最終的な推奨を決定

---

**検証者**: Claude Sonnet 4.5 (via GitHub Copilot)  
**ステータス**: ⚠️ 部分的サポート（改善が必要）
