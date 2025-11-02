// SPDX-License-Identifier: MPL-2.0

import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ArkTypeValidationPipe } from './arktype-validation.pipe';
import { applySchemaMetadata, collectDtoClasses } from './schema-metadata.helper';
import * as dtos from './test.dto';
import * as fs from 'fs';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ArkTypeValidationPipeをグローバルに適用
  app.useGlobalPipes(new ArkTypeValidationPipe());

  // Swagger設定
  const config = new DocumentBuilder()
    .setTitle('ArkType+NestJS Integration Test')
    .setDescription('Testing ArkType integration with NestJS Swagger')
    .setVersion('1.0')
    .build();

  let document = SwaggerModule.createDocument(app, config);
  
  // スキーマレベルのメタデータ（example, description）を適用
  const dtoClasses = collectDtoClasses(dtos);
  document = applySchemaMetadata(document, dtoClasses);
  
  // 生成されたOpenAPIドキュメントをファイルに保存して検証
  fs.writeFileSync(
    './openapi-output.json',
    JSON.stringify(document, null, 2)
  );

  SwaggerModule.setup('api', app, document);

  await app.listen(3000);
  console.log('Application is running on: http://localhost:3000');
  console.log('Swagger UI: http://localhost:3000/api');
  console.log('OpenAPI JSON saved to: ./openapi-output.json');
}

bootstrap();
