import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, UseGuards, ConflictException, NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get()
  async list() {
    return { data: await this.service.findAll() };
  }

  @Post()
  async create(@Body() dto: CreateUserDto) {
    const existing = await this.service.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already in use');
    const user = await this.service.create(dto);
    const { password, ...rest } = user;
    return rest;
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    if (dto.email) {
      const existing = await this.service.findByEmail(dto.email);
      if (existing && existing.id !== id) throw new ConflictException('Email already in use');
    }
    const user = await this.service.update(id, dto);
    if (!user) throw new NotFoundException('User not found');
    const { password, ...rest } = user;
    return rest;
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.service.remove(id);
    return null;
  }
}
