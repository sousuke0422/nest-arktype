// SPDX-License-Identifier: MPL-2.0

import { Module } from '@nestjs/common';
import { TestController } from './test.controller';

@Module({
  controllers: [TestController],
})
export class AppModule {}

