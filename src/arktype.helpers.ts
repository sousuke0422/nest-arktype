import { type, Type } from 'arktype';
import { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';

/**
 * ArkTypeの型に任意のメタデータを付与するためのラッパー
 */
type ArkTypeWithMeta<T extends Type> = T & { __meta?: Record<string, any> };

export function arkWithMeta<T extends Type>(
  arktype: T,
  meta: Record<string, any>,
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

  // メタデータをマージ
  const customMeta = (arktype as ArkTypeWithMeta<Type>).__meta;
  if (customMeta) {
    Object.assign(cleanSchema, customMeta);
  }

  // OpenAPIスキーマ全体ではなく、プロパティメタデータとして返す
  // NestJSは "properties" と "required" を期待する
  const properties = cleanSchema.properties || {};
  const required = cleanSchema.required || [];

  const metadata: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(properties)) {
    const propSchema = normalizeNullableSchema(value as any);
    metadata[key] = {
      ...propSchema,
      required: required.includes(key),
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
    // 単一の型 + null の場合（最も一般的）
    // { anyOf: [{ type: "string" }, { type: "null" }] } 
    // → { type: "string", nullable: true }
    return {
      ...nonNullSchemas[0],
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
