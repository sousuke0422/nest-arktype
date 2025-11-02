# Date型検証報告書

**検証日時**: 2025-11-02  
**Git Commit**: `5e3933f`  
**前回のベースライン**: `05ae2d3`

---

## 検証結果: ✅ Date型は完全に動作する

### 重要な発見

**❌ 誤り: 文書で提案されている`type("Date")`は使用できない**

文書（Section III, Section VI）では以下のように記載されている:

```typescript
const EventSchemaDefinition = type({
  title: 'string',
  startDate: 'Date',
  'endDate?': 'Date',
});
```

**問題**: HTTP/JSONでは日付は文字列として送信されるため、ArkTypeの`Date`型（JavaScriptの`Date`オブジェクトを期待）はHTTP APIでは使用できない。

**エラーメッセージ**:
```
startDate must be a Date (was string)
```

### ✅ 正しい実装: `string.date.parse`を使用

```typescript
const EventSchemaDefinition = type({
  title: 'string',
  startDate: 'string.date.parse', // ISO 8601文字列をDateに変換
  'endDate?': 'string.date.parse',
});
```

**動作**:
- ISO 8601形式の文字列を受け取る
- バリデーション後、JavaScript `Date`オブジェクトに変換する
- レスポンスではISO文字列に自動変換される

---

## テスト結果

### テスト1: 有効なISO 8601日付

**リクエスト**:
```json
POST /test/event
{
  "title": "Conference",
  "startDate": "2025-12-01T09:00:00Z"
}
```

**レスポンス**: ✅ `200 OK`
```json
{
  "success": true,
  "data": {
    "title": "Conference",
    "startDate": "2025-12-01T09:00:00.000Z"
  }
}
```

**評価**: 完璧。文字列がDateに変換され、再度ISO文字列として返されている。

### テスト2: 無効な日付文字列

**リクエスト**:
```json
POST /test/event
{
  "title": "Conference",
  "startDate": "invalid-date"
}
```

**レスポンス**: ✅ `400 Bad Request`
```json
{
  "message": "Validation failed",
  "errors": "startDate must be a parsable date (was \"invalid-date\")"
}
```

**評価**: エラーメッセージが明確で理解しやすい。

### テスト3: オプショナルなDate フィールド

**リクエスト**:
```json
POST /test/event
{
  "title": "Conference",
  "startDate": "2025-12-01T09:00:00Z",
  "endDate": "2025-12-02T17:00:00Z"
}
```

**レスポンス**: ✅ `200 OK`
```json
{
  "success": true,
  "data": {
    "title": "Conference",
    "startDate": "2025-12-01T09:00:00.000Z",
    "endDate": "2025-12-02T17:00:00.000Z"
  }
}
```

**評価**: オプショナルフィールド(`endDate?`)も正常に動作。

---

## OpenAPIスキーマ生成

**生成されたスキーマ**:
```json
{
  "CreateEventDto": {
    "type": "object",
    "properties": {
      "startDate": {
        "type": "string",
        "format": "date-time"
      },
      "title": {
        "type": "string"
      },
      "endDate": {
        "type": "string",
        "format": "date-time"
      }
    },
    "required": ["startDate", "title"]
  }
}
```

**評価**: ✅ **完璧**
- `type: "string", format: "date-time"`はOpenAPI標準に準拠
- `fallback`設定が正常に機能している
- `required`配列にオプショナルフィールドが含まれていない

---

## fallback設定の動作確認

文書（Section VI）で提案されている`fallback`設定:

```typescript
fallback: {
  date: (ctx) => ({
    ...ctx.base,
    type: 'string',
    format: 'date-time',
  }),
  // ...
}
```

**検証結果**: ✅ **正常に動作**

ArkTypeの`string.date.parse`は内部的に`Date`型を使用しているため、`fallback`の`date`ハンドラーが呼び出され、OpenAPI互換のスキーマに変換されている。

---

## ファクトチェック報告書への追記

### Section III: ArkTypeのtoJsonSchema()の評価

**問題2の更新**:

**文書の記述**:
> **問題2: Date型の処理**
> 
> **テスト対象**:
> ```typescript
> const EventSchemaDefinition = type({
>   title: 'string',
>   startDate: 'Date',
>   'endDate?': 'Date',
> });
> ```
> 
> **結果**: 🔬 **未テスト**

**検証後の更新**:
> **問題2: Date型の処理**
> 
> **❌ 誤った実装**:
> ```typescript
> startDate: 'Date' // HTTP経由では動作しない
> ```
> 
> **✅ 正しい実装**:
> ```typescript
> startDate: 'string.date.parse' // ISO 8601文字列を受け取り、Dateに変換
> ```
> 
> **結果**: ✅ **完全に動作**
> - バリデーション: ISO 8601形式のチェック
> - 変換: 文字列 → Date オブジェクト
> - OpenAPI: `type: "string", format: "date-time"`
> - エラーメッセージ: "must be a parsable date"

### Section VI: 最終勧告とリファレンス実装

**誤り3: Date型の使用例**

**文書の記述**:
```typescript
fallback: {
  date: (ctx) => ({
    ...ctx.base,
    type: 'string',
    format: 'date-time',
  }),
  // ...
}
```

**評価**: ✅ **fallback設定自体は正しい**

**ただし、使用例を修正**:
```typescript
// ❌ 誤り
const EventSchema = type({
  startDate: 'Date'
});

// ✅ 正解
const EventSchema = type({
  startDate: 'string.date.parse' // HTTPで文字列を受け取り、Dateに変換
});
```

---

## 最終結論

### Date型のサポート: ✅ 完全に動作

1. ✅ `string.date.parse`を使用すれば、HTTP APIで日付を扱える
2. ✅ バリデーション、変換、OpenAPI生成すべて正常
3. ✅ エラーメッセージが明確
4. ✅ オプショナルフィールドも正常に動作

### 推奨事項

**HTTP API用のDate型定義**:
```typescript
// 推奨: string.date.parse (ISO 8601文字列を受け取る)
const ApiSchema = type({
  createdAt: 'string.date.parse',
  'updatedAt?': 'string.date.parse'
});

// 非推奨: Date (JavaScript Dateオブジェクトのみ受け付ける)
// HTTP経由では使用しないこと
```

### ファクトチェック報告書の評価更新

| 評価項目 | 検証前 | 検証後 (Date型テスト後) |
|---------|--------|----------------------|
| 技術的正確性 | ⭐⭐⭐⭐⭐ (5/5) | ⭐⭐⭐⭐⭐ (5/5) |
| 実装可能性 | ⭐⭐⭐⭐⭐ (5/5) | ⭐⭐⭐⭐⭐ (5/5) |
| 文書の完全性 | ⭐⭐⭐⭐☆ (4/5) | ⭐⭐⭐⭐☆ (4/5) - Date型の例が不正確 |
| リスク評価 | ⭐⭐⭐⭐☆ (4/5) | ⭐⭐⭐⭐⭐ (5/5) - Date型の懸念は解消 |

### 残存する未検証項目

1. ⚠️ **複雑な型の互換性** - ユニオン型(`string | null`)、判別共用体
2. ✅ **Date型** - **完全に検証済み**
3. ⚠️ **メタデータマージ** - `arkWithMeta`の完全性

---

**検証者**: Claude Sonnet 4.5 (via GitHub Copilot)  
**Git履歴**: `git log --oneline` で確認可能  
**ロールバック**: `git checkout 05ae2d3` でDate型テスト前の状態に戻せる
