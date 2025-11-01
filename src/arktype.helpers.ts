import { type, Type } from 'arktype';
import { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';

/**
 * プロパティレベルのメタデータ定義
 */
export interface PropertyMetadata {
  description?: string;
  example?: any;
  deprecated?: boolean;
  externalDocs?: {
    description?: string;
    url: string;
  };
}

/**
 * スキーマ全体のメタデータ定義
 * 型パラメータTKeysでプロパティ名を型安全にする
 */
export interface SchemaMetadata<TKeys extends string = string> {
  description?: string;
  example?: any;
  properties?: Partial<Record<TKeys, PropertyMetadata>>;
}

/**
 * ArkTypeの型にメタデータを付与するための内部型
 */
type ArkTypeWithMeta<T extends Type> = T & { 
  __meta?: SchemaMetadata<any>;
};

/**
 * ArkTypeの推論された型からプロパティキーを抽出（文字列のみ）
 */
type InferredPropertyKeys<T extends Type> = Extract<keyof T['infer'], string>;

/**
 * ArkTypeスキーマにメタデータを付与するヘルパー関数
 * 
 * @example
 * const UserSchema = type({ name: 'string', email: 'string.email' });
 * const UserWithMeta = arkWithMeta(UserSchema, {
 *   description: 'User creation data',
 *   example: { name: 'John', email: 'john@example.com' },
 *   properties: {
 *     name: { description: 'User name', example: 'John Doe' },
 *     email: { description: 'Email address', example: 'john@example.com' }
 *     // invalidKey: { ... } ← TypeScriptエラーになる（型安全）
 *   }
 * });
 */
export function arkWithMeta<T extends Type>(
  arktype: T,
  meta: SchemaMetadata<InferredPropertyKeys<T>>,
): ArkTypeWithMeta<T> {
  (arktype as ArkTypeWithMeta<T>).__meta = meta;
  return arktype;
}

/**
 * ArkTypeスキーマをOpenAPI互換のプロパティメタデータに変換
 * _OPENAPI_METADATA_FACTORYはプロパティごとのスキーマを返す必要がある
 */
function arkTypeToApiMetadata(arktype: Type): Record<string, any> {
  const jsonSchema = arktype.toJsonSchema({
    fallback: {
      date: (ctx) => ({
        ...ctx.base,
        type: 'string',
        format: 'date-time',
      }),
      predicate: (ctx) => ctx.base,
      morph: (ctx) => ctx.base,
      default: (ctx) => ctx.base,
    },
  }) as any;

  // $schemaプロパティを削除
  const { $schema, ...cleanSchema } = jsonSchema;

  // arkWithMetaで付与されたメタデータを取得
  const customMeta = (arktype as ArkTypeWithMeta<Type>).__meta;

  // OpenAPIスキーマ全体ではなく、プロパティメタデータとして返す
  // NestJSは "properties" と "required" を期待する
  const properties = cleanSchema.properties || {};
  const required = cleanSchema.required || [];

  const metadata: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(properties)) {
    const propSchema = normalizeNullableSchema(value as any);
    
    // プロパティレベルのメタデータをマージ
    const propMeta = customMeta?.properties?.[key];
    
    metadata[key] = {
      ...propSchema,
      required: required.includes(key),
      // description, example, deprecatedなどを追加
      ...(propMeta?.description && { description: propMeta.description }),
      ...(propMeta?.example !== undefined && { example: propMeta.example }),
      ...(propMeta?.deprecated && { deprecated: propMeta.deprecated }),
      ...(propMeta?.externalDocs && { externalDocs: propMeta.externalDocs }),
    };
  }

  return metadata;
}

/**
 * anyOf形式のnullableスキーマをOpenAPI 3.0互換形式に変換
 * { anyOf: [{ type: "string" }, { type: "null" }] } 
 * → { type: "string", nullable: true }
 */
function normalizeNullableSchema(schema: any): any {
  // anyOfがなければそのまま返す
  if (!schema.anyOf || !Array.isArray(schema.anyOf)) {
    return schema;
  }

  // anyOfの中にtype: "null"があるかチェック
  const hasNull = schema.anyOf.some((s: any) => s.type === 'null');
  if (!hasNull) {
    return schema; // nullableではないanyOfはそのまま
  }

  // nullでない型を抽出
  const nonNullSchemas = schema.anyOf.filter((s: any) => s.type !== 'null');

  if (nonNullSchemas.length === 0) {
    // すべてnullの場合
    return { type: 'null' };
  }

  if (nonNullSchemas.length === 1) {
    const singleSchema = nonNullSchemas[0];
    
    // constプロパティがある場合（enum値）
    if (singleSchema.const !== undefined) {
      // { anyOf: [{ const: "active" }, { const: "inactive" }, { type: "null" }] }
      // → OpenAPI 3.0では表現できないので、anyOfのままにする
      // ただし、nullableフラグを追加
      return {
        anyOf: nonNullSchemas,
        nullable: true,
      };
    }
    
    // 単一の型 + null の場合（最も一般的）
    // { anyOf: [{ type: "string" }, { type: "null" }] } 
    // → { type: "string", nullable: true }
    return {
      ...singleSchema,
      nullable: true,
    };
  }

  // 複数の型 + null の場合
  // { anyOf: [{ type: "string" }, { type: "number" }, { type: "null" }] }
  // → { anyOf: [{ type: "string" }, { type: "number" }], nullable: true }
  return {
    anyOf: nonNullSchemas,
    nullable: true,
  };
}

/**
 * ArkTypeスキーマからNestJS互換のDTOクラスを生成
 */
export function createArkTypeDto<T extends Type>(arktype: T) {
  class ArkTypeDto {
    public static _OPENAPI_METADATA_FACTORY(): Record<string, any> {
      return arkTypeToApiMetadata(arktype);
    }
  }

  // バリデーションパイプ用にschemaを後から追加（enumerable: falseで隠蔽）
  Object.defineProperty(ArkTypeDto, 'schema', {
    value: arktype,
    writable: false,
    enumerable: false, // NestJS Swaggerのスキャンから隠す
    configurable: false,
  });

  return ArkTypeDto;
}
