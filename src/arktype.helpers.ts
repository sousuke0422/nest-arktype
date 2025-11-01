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
    metadata[key] = {
      ...(value as any),
      required: required.includes(key),
    };
  }

  return metadata;
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
