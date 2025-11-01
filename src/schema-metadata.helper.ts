import { Type } from 'arktype';

/**
 * SwaggerドキュメントにArkTypeスキーマレベルのメタデータを適用する後処理関数
 * 
 * _OPENAPI_METADATA_FACTORYではプロパティレベルのメタデータしか返せないため、
 * この関数でスキーマ全体のexampleとdescriptionを追加する。
 * 
 * @param document SwaggerModule.createDocument()で生成されたOpenAPIドキュメント
 * @param dtoClasses メタデータを持つDTOクラスの配列
 * 
 * @example
 * // main.ts
 * let document = SwaggerModule.createDocument(app, config);
 * document = applySchemaMetadata(document, [
 *   CreateUserDto,
 *   CreateProductDto,
 *   CreateEventDto
 * ]);
 * SwaggerModule.setup('api', app, document);
 */
export function applySchemaMetadata(
  document: any,
  dtoClasses: any[]
): any {
  if (!document?.components?.schemas) {
    console.warn('applySchemaMetadata: No schemas found in document');
    return document;
  }

  for (const dtoClass of dtoClasses) {
    // DTOクラスからArkTypeスキーマとメタデータを取得
    const arkTypeSchema = dtoClass.schema;
    if (!arkTypeSchema || !(arkTypeSchema instanceof Type)) {
      continue; // ArkTypeスキーマを持たないDTOはスキップ
    }

    const meta = (arkTypeSchema as any).__meta;
    if (!meta) {
      continue; // メタデータがない場合はスキップ
    }

    // DTOクラス名からOpenAPIスキーマ名を取得
    const schemaName = dtoClass.name;
    const schema = document.components.schemas[schemaName];

    if (!schema) {
      console.warn(`applySchemaMetadata: Schema "${schemaName}" not found in document`);
      continue;
    }

    // スキーマレベルのexampleを追加
    if (meta.example !== undefined) {
      schema.example = meta.example;
    }

    // スキーマレベルのdescriptionを追加
    if (meta.description) {
      schema.description = meta.description;
    }
  }

  return document;
}

/**
 * アプリケーション内のすべてのDTOクラスを自動的に収集する関数
 * 
 * @param dtoModule DTOをエクスポートしているモジュール
 * @returns ArkTypeスキーマを持つDTOクラスの配列
 * 
 * @example
 * import * as dtos from './test.dto';
 * const dtoClasses = collectDtoClasses(dtos);
 * document = applySchemaMetadata(document, dtoClasses);
 */
export function collectDtoClasses(dtoModule: any): any[] {
  const dtoClasses: any[] = [];

  for (const key in dtoModule) {
    const exported = dtoModule[key];
    
    // クラスかどうかをチェック
    if (typeof exported === 'function' && exported.prototype) {
      // ArkTypeスキーマを持っているかチェック
      if (exported.schema && exported.schema instanceof Type) {
        dtoClasses.push(exported);
      }
    }
  }

  return dtoClasses;
}
