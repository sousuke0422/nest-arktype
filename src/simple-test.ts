import { type } from 'arktype';
import { createArkTypeDto } from './arktype.helpers';

// 最もシンプルなテスト
const SimpleSchema = type({
  name: 'string',
});

export class SimpleDto extends createArkTypeDto(SimpleSchema) {}

// _OPENAPI_METADATA_FACTORYの動作を確認
console.log('SimpleDto has _OPENAPI_METADATA_FACTORY:', typeof SimpleDto._OPENAPI_METADATA_FACTORY);
console.log('SimpleDto._OPENAPI_METADATA_FACTORY():', JSON.stringify(SimpleDto._OPENAPI_METADATA_FACTORY(), null, 2));
