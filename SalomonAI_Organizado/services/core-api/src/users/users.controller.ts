import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiKeyGuard } from '../guards/api-key.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Obtener perfil del usuario autenticado
   */
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req): Promise<User> {
    return this.usersService.findById(req.user.id);
  }

  /**
   * Actualizar perfil del usuario autenticado
   */
  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @Request() req,
    @Body() updateData: Partial<User>,
  ): Promise<User> {
    // Remover campos que no pueden ser actualizados directamente
    const { id, uid, email, roles, ...allowedUpdates } = updateData;
    
    return this.usersService.update(req.user.id, allowedUpdates);
  }

  /**
   * Desactivar cuenta del usuario autenticado
   */
  @Delete('profile')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deactivateAccount(@Request() req): Promise<void> {
    await this.usersService.deactivate(req.user.id);
  }

  /**
   * Obtener usuario por ID (Admin)
   */
  @Get(':id')
  @UseGuards(ApiKeyGuard)
  async findOne(@Param('id') id: string): Promise<User> {
    return this.usersService.findById(id);
  }

  /**
   * Listar usuarios (Admin)
   */
  @Get()
  @UseGuards(ApiKeyGuard)
  async findAll(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<{
    users: User[];
    total: number;
  }> {
    const parsedLimit = limit ? parseInt(limit, 10) : 100;
    const parsedOffset = offset ? parseInt(offset, 10) : 0;
    
    return this.usersService.findAll(parsedLimit, parsedOffset);
  }

  /**
   * Actualizar usuario (Admin)
   */
  @Patch(':id')
  @UseGuards(ApiKeyGuard)
  async update(
    @Param('id') id: string,
    @Body() updateData: Partial<User>,
  ): Promise<User> {
    return this.usersService.update(id, updateData);
  }

  /**
   * Activar usuario (Admin)
   */
  @Post(':id/activate')
  @UseGuards(ApiKeyGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async activate(@Param('id') id: string): Promise<void> {
    await this.usersService.activate(id);
  }

  /**
   * Desactivar usuario (Admin)
   */
  @Post(':id/deactivate')
  @UseGuards(ApiKeyGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deactivate(@Param('id') id: string): Promise<void> {
    await this.usersService.deactivate(id);
  }
}
