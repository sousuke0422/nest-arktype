import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const ZodUserSchema = z.object({
  name: z.string(),
  age: z.number(),
});

class ZodTestDto extends createZodDto(ZodUserSchema) {}

console.log('ZodTestDto has _OPENAPI_METADATA_FACTORY:', typeof ZodTestDto._OPENAPI_METADATA_FACTORY);
console.log('ZodTestDto._OPENAPI_METADATA_FACTORY():', JSON.stringify(ZodTestDto._OPENAPI_METADATA_FACTORY(), null, 2));
console.log('\nZodTestDto properties:', Object.keys(ZodTestDto));
console.log('ZodTestDto.prototype properties:', Object.keys(ZodTestDto.prototype));
