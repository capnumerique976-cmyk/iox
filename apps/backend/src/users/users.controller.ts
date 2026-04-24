import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import {
  CreateUserDto,
  UpdateUserDto,
  UpdateMyProfileDto,
  QueryUsersDto,
} from './dto/create-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole, RequestUser } from '@iox/shared';

@ApiTags('users')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR)
  @ApiOperation({ summary: 'Liste des utilisateurs' })
  findAll(@Query() query: QueryUsersDto) {
    return this.usersService.findAll(query);
  }

  @Get('me')
  @ApiOperation({ summary: "Profil complet de l'utilisateur connecté" })
  async getMyProfile(@CurrentUser() user: RequestUser) {
    return this.usersService.findById(user.id);
  }

  @Patch('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mettre à jour son propre profil (nom, mot de passe)' })
  async updateMyProfile(@Body() dto: UpdateMyProfileDto, @CurrentUser() user: RequestUser) {
    return this.usersService.updateMyProfile(user.id, dto);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR)
  @ApiOperation({ summary: "Détail d'un utilisateur" })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findById(id);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Créer un utilisateur' })
  create(@Body() dto: CreateUserDto, @CurrentUser() actor: RequestUser) {
    return this.usersService.create(dto, actor.id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Modifier un utilisateur' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.usersService.update(id, dto, actor.id);
  }

  @Patch(':id/deactivate')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Désactiver un utilisateur' })
  deactivate(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: RequestUser) {
    return this.usersService.deactivate(id, actor.id);
  }

  @Patch(':id/activate')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Réactiver un utilisateur' })
  activate(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: RequestUser) {
    return this.usersService.activate(id, actor.id);
  }
}
