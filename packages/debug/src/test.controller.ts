// SPDX-License-Identifier: MPL-2.0

import { Controller, Post, Body, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { 
  CreateUserDto, 
  CreateProductDto, 
  CreateEventDto, 
  ComplexDto, 
  NullableDto
  // MixedUnionDto - 一旦コメントアウト（anyOf形式の制限）
} from './test.dto';

@ApiTags('test')
@Controller('test')
export class TestController {
  @Post('user')
  @ApiOperation({ summary: 'Create a user' })
  @ApiResponse({ status: 201, description: 'User created', type: CreateUserDto })
  createUser(@Body() dto: CreateUserDto) {
    return { success: true, data: dto };
  }

  @Post('product')
  @ApiOperation({ summary: 'Create a product' })
  @ApiResponse({ status: 201, description: 'Product created', type: CreateProductDto })
  createProduct(@Body() dto: CreateProductDto) {
    return { success: true, data: dto };
  }

  @Post('event')
  @ApiOperation({ summary: 'Create an event' })
  @ApiResponse({ status: 201, description: 'Event created', type: CreateEventDto })
  createEvent(@Body() dto: CreateEventDto) {
    return { success: true, data: dto };
  }

  @Post('complex')
  @ApiOperation({ summary: 'Test complex types (enum, array)' })
  @ApiResponse({ status: 201, description: 'Complex data processed', type: ComplexDto })
  testComplex(@Body() dto: ComplexDto) {
    return { success: true, data: dto };
  }

  @Post('nullable')
  @ApiOperation({ summary: 'Test nullable types' })
  @ApiResponse({ status: 201, description: 'Nullable data processed', type: NullableDto })
  testNullable(@Body() dto: NullableDto) {
    return { success: true, data: dto };
  }

  // Mixed union - 一旦コメントアウト（enum + null問題の調査中）
  // @Post('mixed-union')
  // @ApiOperation({ summary: 'Test mixed union types (string | number)' })
  // @ApiResponse({ status: 201, description: 'Mixed union data processed', type: MixedUnionDto })
  // testMixedUnion(@Body() dto: MixedUnionDto) {
  //   return { success: true, data: dto };
  // }

  @Get('health')
  health() {
    return { status: 'ok' };
  }
}

