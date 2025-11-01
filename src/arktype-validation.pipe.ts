import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { type, Type } from 'arktype';

@Injectable()
export class ArkTypeValidationPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    const metatype = metadata.metatype as any;

    if (!metatype || !metatype.schema || !(metatype.schema instanceof Type)) {
      return value;
    }

    const arktype: Type = metatype.schema;
    const result = arktype(value);

    if (result instanceof type.errors) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: result.summary,
      });
    }

    return result;
  }
}
