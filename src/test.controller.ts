import { Controller, Post, Body, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CreateUserDto, CreateProductDto } from './test.dto';

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

  @Get('health')
  health() {
    return { status: 'ok' };
  }
}
