import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { CurrentUserData } from '../../common/types/current-user';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ChangeStatusDto } from './dto/change-status.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ---- Cuenta propia (cualquier usuario autenticado). Declaradas antes de /:id. ----

  @Get('me')
  @ApiOperation({ summary: 'Mi perfil con sus datos (cualquier rol)' })
  me(@CurrentUser() user: CurrentUserData) {
    return this.usersService.findOne(user.userId);
  }

  @Patch('me')
  @ApiOperation({
    summary: 'Editar mi perfil (PACIENTE: nombre, apellido, teléfono; ODONTOLOGO: nombre)',
  })
  updateMe(@CurrentUser() user: CurrentUserData, @Body() dto: UpdateMyProfileDto) {
    return this.usersService.updateMyProfile(user.userId, dto);
  }

  @Patch('me/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cambiar mi contraseña verificando la actual' })
  changePassword(@CurrentUser() user: CurrentUserData, @Body() dto: ChangePasswordDto) {
    return this.usersService.changePassword(user.userId, dto);
  }

  // ---- Gestión de usuarios (solo ADMIN) ----

  @Get()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Lista todos los usuarios con su perfil (solo ADMIN)' })
  findAll() {
    return this.usersService.findAll();
  }

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Crea un ODONTOLOGO o un ADMIN (solo ADMIN)' })
  create(@Body() dto: CreateUserDto) {
    return this.usersService.createStaff(dto);
  }

  @Get(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Detalle de un usuario (solo ADMIN)' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Edita email y datos de perfil de un usuario; el rol no cambia (solo ADMIN)',
  })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Patch(':id/estado')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Habilita o deshabilita una cuenta; no la propia (solo ADMIN)' })
  changeStatus(
    @CurrentUser() user: CurrentUserData,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeStatusDto,
  ) {
    return this.usersService.changeStatus(user.userId, id, dto.activo);
  }
}
