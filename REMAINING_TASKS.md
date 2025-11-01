# 残存課題と優先順位

**作成日**: 2025-11-02  
**プロジェクト**: arktype-nestjs-prototype

---

## 📊 現在の状態

### ✅ 完全に実装・検証済み (10項目)

1. ✅ 基本型（string, number, boolean）
2. ✅ オプショナルフィールド（`key?`）
3. ✅ Nullable型（`string | null`）
4. ✅ Date型（`string.date.parse`）
5. ✅ 配列型（`string[]`）
6. ✅ Enum/Union型（`'a' | 'b'`）
7. ✅ 数値制約（`number>0`, `number>=0`）
8. ✅ メール検証（`string.email`）
9. ✅ プロパティレベルのdescription/example
10. ✅ class-validatorとの共存

---

## 🔧 残存課題（優先順位順）

### 優先度: 高（本番導入前に解決推奨）

#### 1. スキーマレベルのexample/descriptionの反映

**現状**: 
- データは受け取れるが、OpenAPIスキーマに反映されない

**影響**:
- Swagger UIの「Example Value」セクションが空になる
- APIドキュメントの質が低下

**解決策**:
```typescript
// 案1: 後処理関数
function applySchemaMetadata(document: any, dtoClasses: any[]) {
  for (const dto of dtoClasses) {
    const meta = dto.schema?.__meta;
    if (meta?.example || meta?.description) {
      const schemaName = dto.name;
      if (meta.example) {
        document.components.schemas[schemaName].example = meta.example;
      }
      if (meta.description) {
        document.components.schemas[schemaName].description = meta.description;
      }
    }
  }
}

// main.tsで使用
let document = SwaggerModule.createDocument(app, config);
applySchemaMetadata(document, [CreateUserDto, CreateProductDto, ...]);
```

**実装コスト**: 中（1-2日）  
**テスト済み**: ❌

---

#### 2. 複雑なUnion型のサポート

**現状**:
- ✅ `'a' | 'b' | 'c'` - 文字列リテラル（enum）は動作
- ✅ `string | null` - nullableは動作
- ❌ `string | number` - 異なる型のユニオンは未検証

**テストが必要な型**:
```typescript
const MixedUnionSchema = type({
  value: 'string | number',  // ← これ
  status: '"active" | "inactive" | null',  // ← これ
});
```

**期待されるOpenAPI**:
```json
{
  "value": {
    "anyOf": [
      { "type": "string" },
      { "type": "number" }
    ]
  }
}
```

**実装コスト**: 低（数時間、テストのみ）  
**テスト済み**: ❌

---

#### 3. 判別共用体（Discriminated Unions）

**現状**: 未検証

**例**:
```typescript
const EventSchema = type({
  type: '"online" | "in-person"',
  location: 'string',  // type='in-person'の場合のみ
  url: 'string',       // type='online'の場合のみ
});
```

**OpenAPIでの表現**:
```json
{
  "oneOf": [
    {
      "type": "object",
      "properties": {
        "type": { "const": "online" },
        "url": { "type": "string" }
      }
    },
    {
      "type": "object",
      "properties": {
        "type": { "const": "in-person" },
        "location": { "type": "string" }
      }
    }
  ],
  "discriminator": { "propertyName": "type" }
}
```

**実装コスト**: 高（3-5日、ArkTypeの判別共用体APIの調査が必要）  
**テスト済み**: ❌

---

### 優先度: 中（将来的に対応）

#### 4. ネストしたオブジェクトのメタデータ

**現状**: フラットなオブジェクトのみサポート

**例**:
```typescript
const OrderSchema = type({
  customer: {
    name: 'string',
    email: 'string.email'
  },
  shipping: {
    address: 'string',
    city: 'string'
  }
});

// メタデータをどう定義する？
const OrderWithMeta = arkWithMeta(OrderSchema, {
  properties: {
    'customer.name': { description: '...' },  // ← この形式？
    'customer.email': { description: '...' },
    // または
    customer: {
      properties: {
        name: { description: '...' },  // ← この形式？
        email: { description: '...' }
      }
    }
  }
});
```

**実装コスト**: 中（2-3日）  
**テスト済み**: ❌

---

#### 5. 配列要素のメタデータ

**現状**: 配列型はサポートされているが、要素のメタデータは未対応

**例**:
```typescript
const ProductSchema = type({
  tags: 'string[]',
  images: 'URL[]'
});

// 配列要素のメタデータ
const ProductWithMeta = arkWithMeta(ProductSchema, {
  properties: {
    tags: {
      description: 'Product tags',
      items: {  // ← 配列要素のメタデータ
        description: 'A single tag',
        example: 'electronics'
      }
    }
  }
});
```

**期待されるOpenAPI**:
```json
{
  "tags": {
    "type": "array",
    "description": "Product tags",
    "items": {
      "type": "string",
      "description": "A single tag",
      "example": "electronics"
    }
  }
}
```

**実装コスト**: 中（2-3日）  
**テスト済み**: ❌

---

#### 6. プロパティ名の型安全性

**現状**: `properties`のキーは文字列で、タイプミスを検出できない

**例**:
```typescript
const UserSchema = type({ name: 'string', email: 'string' });

arkWithMeta(UserSchema, {
  properties: {
    name: { ... },
    email: { ... },
    invalidKey: { ... }  // ← エラーにならない
  }
});
```

**理想的な実装**:
```typescript
type PropertyKeys<T extends Type> = keyof T['infer'];

export function arkWithMeta<T extends Type>(
  arktype: T,
  meta: SchemaMetadata<PropertyKeys<T>>  // ← 型安全
): ArkTypeWithMeta<T>
```

**実装コスト**: 低（半日、TypeScript型定義のみ）  
**テスト済み**: ❌

---

### 優先度: 低（Nice to have）

#### 7. パフォーマンスベンチマーク

**現状**: 定性的な評価のみ

**必要なテスト**:
- `toJsonSchema()`の変換時間（起動時）
- バリデーション性能（リクエスト時）
- class-validator / Zod との比較

**実装コスト**: 中（1-2日）  
**テスト済み**: ❌

---

#### 8. エラーメッセージのカスタマイズ

**現状**: ArkTypeのデフォルトエラーメッセージをそのまま使用

**例**:
```
"age must be positive (was -5)"
```

**カスタマイズ例**:
```typescript
const UserSchema = type({
  age: 'number>0'
}).withErrors({
  'number>0': 'Age must be a positive number'
});
```

**実装コスト**: 低（半日）  
**テスト済み**: ❌

---

#### 9. npmパッケージ化

**必要な作業**:
- [ ] package.jsonの整備
- [ ] README.mdの作成
- [ ] ライセンスの選定
- [ ] npmへの公開
- [ ] GitHub ActionsでのCI/CD

**実装コスト**: 中（3-5日）  
**テスト済み**: ❌

---

## 📅 推奨ロードマップ

### フェーズ1: 本番導入準備（1-2週間）

**目標**: 基本的なユースケースで本番導入可能な状態にする

- [ ] 1. スキーマレベルのexample/description（高）
- [ ] 2. 複雑なUnion型のテスト（高）
- [ ] 6. プロパティ名の型安全性（低コスト）
- [ ] 8. エラーメッセージのカスタマイズ（低コスト）

**成果物**: 
- 本番環境で使用可能なライブラリ
- 使用ガイドライン

---

### フェーズ2: 機能拡張（1ヶ月）

**目標**: 複雑なユースケースをサポート

- [ ] 3. 判別共用体（高、時間かかる）
- [ ] 4. ネストしたオブジェクト（中）
- [ ] 5. 配列要素のメタデータ（中）
- [ ] 7. パフォーマンスベンチマーク（中）

**成果物**:
- 包括的なドキュメント
- パフォーマンスレポート

---

### フェーズ3: オープンソース化（3ヶ月）

**目標**: コミュニティでの採用

- [ ] 9. npmパッケージ化
- [ ] CI/CDの整備
- [ ] サンプルプロジェクトの作成
- [ ] ブログ記事の執筆

**成果物**:
- npmパッケージ
- GitHubリポジトリ
- 技術記事

---

## 🎯 次のアクション（即座に実施可能）

### 1時間以内

```bash
# 複雑なUnion型のテストを追加
cd F:\work\arktype-nestjs-prototype
```

```typescript
// src/test.dto.ts に追加
const MixedUnionSchema = type({
  value: 'string | number',
  status: '"active" | "inactive" | null',
});

export class MixedUnionDto extends createArkTypeDto(MixedUnionSchema) {}
```

### 今日中

スキーマレベルのexampleを反映する後処理関数を実装

---

## まとめ

### 現在の完成度: 80%

**本番導入可能な範囲**:
- ✅ 基本型、オプショナル、nullable
- ✅ Date型、配列型、enum
- ✅ プロパティレベルのメタデータ
- ✅ バリデーション

**残りの20%**:
- ⚠️ スキーマレベルのメタデータ（高優先）
- ⚠️ 複雑なUnion型（テストのみ必要）
- ⚠️ 判別共用体（将来対応）
- ⚠️ ネストしたオブジェクト（将来対応）

**結論**: **基本的なCRUD APIには十分使用可能**。高度な機能は段階的に追加。
