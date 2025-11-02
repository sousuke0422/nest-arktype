# OpenAPIの2種類のexampleの違い

## 概要

OpenAPIには**2種類のexample**があります：

1. **スキーマレベルのexample** - オブジェクト全体のサンプル
2. **プロパティレベルのexample** - 各フィールドのサンプル

---

## 1. スキーマレベルのexample

### 定義

```typescript
const UserSchema = arkWithMeta(UserSchemaDefinition, {
  // ← これがスキーマレベルのexample
  example: {
    name: 'John Doe',
    email: 'john.doe@example.com',
    age: 30
  },
  properties: { ... }
});
```

### OpenAPIでの表現

```json
{
  "CreateUserDto": {
    "type": "object",
    "properties": { ... },
    "required": ["email", "name"],
    "example": {
      "name": "John Doe",
      "email": "john.doe@example.com",
      "age": 30
    }
  }
}
```

### Swagger UIでの表示

**「Example Value」セクション**に表示されます：

```
Example Value

{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "age": 30
}
```

### 用途

- **APIドキュメント全体**のサンプル
- **「Try it out」機能**でリクエストボディのデフォルト値として使用
- 複数のフィールドの**関係性**を示す

---

## 2. プロパティレベルのexample

### 定義

```typescript
const UserSchema = arkWithMeta(UserSchemaDefinition, {
  example: { ... },
  properties: {
    name: {
      description: 'Full name of the user',
      example: 'John Doe'  // ← これがプロパティレベルのexample
    },
    email: {
      description: 'Email address of the user',
      example: 'john.doe@example.com'  // ← これも
    }
  }
});
```

### OpenAPIでの表現

```json
{
  "CreateUserDto": {
    "type": "object",
    "properties": {
      "name": {
        "type": "string",
        "description": "Full name of the user",
        "example": "John Doe"
      },
      "email": {
        "type": "string",
        "format": "email",
        "description": "Email address of the user",
        "example": "john.doe@example.com"
      }
    }
  }
}
```

### Swagger UIでの表示

**プロパティの説明の横**に表示されます：

```
name*         string
              Full name of the user
              Example: "John Doe"

email*        string($email)
              Email address of the user
              Example: "john.doe@example.com"
```

### 用途

- **各フィールドの説明**に添えるサンプル値
- フィールドごとの**期待される形式**を示す
- **ドキュメントの可読性**向上

---

## 実際の違いの例

### ケース1: シンプルなDTO

```typescript
const ProductSchema = arkWithMeta(
  type({ name: 'string', price: 'number>0' }),
  {
    // スキーマレベル: オブジェクト全体のサンプル
    example: {
      name: 'Premium Widget',
      price: 99.99
    },
    properties: {
      // プロパティレベル: 各フィールドのサンプル
      name: { 
        description: 'Product name', 
        example: 'Deluxe Gadget'  // ← 違う値でもOK
      },
      price: { 
        description: 'Price in USD', 
        example: 149.99  // ← 違う値でもOK
      }
    }
  }
);
```

**Swagger UIでの表示**:

```
Example Value (スキーマレベル)
{
  "name": "Premium Widget",
  "price": 99.99
}

Schema (プロパティレベル)
name*         string
              Product name
              Example: "Deluxe Gadget"

price*        number
              Price in USD
              Example: 149.99
```

### ケース2: 関連性のあるフィールド

```typescript
const EventSchema = arkWithMeta(
  type({
    startDate: 'string.date.parse',
    endDate: 'string.date.parse',
    title: 'string'
  }),
  {
    // スキーマレベル: 実際のイベントの例（日付の関係性を示す）
    example: {
      title: 'Tech Conference 2025',
      startDate: '2025-12-01T09:00:00Z',
      endDate: '2025-12-03T17:00:00Z'  // ← startDateの後
    },
    properties: {
      title: {
        description: 'Event title',
        example: 'Annual Meeting'  // ← 単独の例
      },
      startDate: {
        description: 'Start date (ISO 8601)',
        example: '2025-01-15T10:00:00Z'  // ← 単独の例
      },
      endDate: {
        description: 'End date (ISO 8601)',
        example: '2025-01-15T18:00:00Z'  // ← 単独の例
      }
    }
  }
);
```

**スキーマレベルのexampleの価値**:
- `startDate`と`endDate`の**関係性**（endDateがstartDateより後）を示せる
- **実際のユースケース**に近いサンプルを提供

**プロパティレベルのexampleの価値**:
- 各フィールドの**フォーマット**を個別に示せる
- フィールドの**説明を補足**できる

---

## 推奨される使い方

### パターン1: 両方を定義（推奨）

```typescript
const UserSchema = arkWithMeta(UserSchemaDefinition, {
  // スキーマレベル: 実際のユースケース
  example: {
    name: 'John Doe',
    email: 'john.doe@example.com',
    age: 30
  },
  // プロパティレベル: 各フィールドの説明用
  properties: {
    name: { 
      description: 'Full name', 
      example: 'Jane Smith' 
    },
    email: { 
      description: 'Email address', 
      example: 'jane.smith@example.com' 
    },
    age: { 
      description: 'Age', 
      example: 25 
    }
  }
});
```

**利点**:
- ✅ APIドキュメントが充実
- ✅ 「Try it out」機能で使いやすい
- ✅ 各フィールドの説明が明確

### パターン2: プロパティレベルのみ

```typescript
const UserSchema = arkWithMeta(UserSchemaDefinition, {
  // スキーマレベルは省略
  properties: {
    name: { description: '...', example: 'John Doe' },
    email: { description: '...', example: 'john@example.com' }
  }
});
```

**利点**:
- ✅ 最小限の記述
- ⚠️ 「Try it out」のデフォルト値がない

### パターン3: スキーマレベルのみ

```typescript
const UserSchema = arkWithMeta(UserSchemaDefinition, {
  example: {
    name: 'John Doe',
    email: 'john.doe@example.com'
  }
  // propertiesは省略
});
```

**利点**:
- ✅ 実際のユースケースを示せる
- ⚠️ 各フィールドの詳細な説明がない

---

## 現在の実装状況

### ✅ サポート済み

- **プロパティレベルのexample** - 完全に動作
- **プロパティレベルのdescription** - 完全に動作

### ⚠️ 部分的サポート

- **スキーマレベルのexample** - 受け取れるが、OpenAPIスキーマに反映されない

### 理由

`_OPENAPI_METADATA_FACTORY`は**プロパティごと**のメタデータしか返せない仕様のため、スキーマ全体のメタデータ（`example`, `description`）は現在反映できません。

---

## スキーマレベルのexampleを反映する方法（将来の実装）

### 解決策1: カスタムデコレータ

```typescript
export function createArkTypeDto<T extends Type>(arktype: T) {
  const meta = (arktype as ArkTypeWithMeta<Type>).__meta;
  
  class ArkTypeDto {
    public static _OPENAPI_METADATA_FACTORY(): Record<string, any> {
      return arkTypeToApiMetadata(arktype);
    }
  }

  // スキーマレベルのexampleをデコレータで追加
  if (meta?.example) {
    Reflect.defineMetadata(
      DECORATORS.API_MODEL_PROPERTIES,
      { example: meta.example },
      ArkTypeDto
    );
  }

  return ArkTypeDto;
}
```

### 解決策2: 後処理関数

```typescript
function applySchemaMetadata(document: any, dtoClass: any) {
  const meta = (dtoClass.schema as ArkTypeWithMeta<Type>).__meta;
  if (meta?.example) {
    const schemaName = dtoClass.name;
    document.components.schemas[schemaName].example = meta.example;
  }
}
```

---

## まとめ

| 種類 | 用途 | 表示場所 | 現在のサポート |
|------|------|---------|--------------|
| スキーマレベルのexample | オブジェクト全体のサンプル | Example Valueセクション | ⚠️ 未反映 |
| プロパティレベルのexample | 各フィールドのサンプル | プロパティ説明の横 | ✅ 完全サポート |

**推奨**: 現時点では**プロパティレベルのexample**を使用してください。スキーマレベルのexampleは将来の拡張で対応予定です。
