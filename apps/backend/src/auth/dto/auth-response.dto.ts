import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { UserRole } from '@iox/shared';

export class AuthUserDto {
  @ApiProperty() id: string;
  @ApiProperty() email: string;
  @ApiProperty() firstName: string;
  @ApiProperty() lastName: string;
  @ApiProperty({ enum: UserRole }) role: UserRole;
}

export class AuthResponseDto {
  @ApiProperty() accessToken: string;
  @ApiProperty() refreshToken: string;
  @ApiProperty() expiresIn: number;
  @ApiProperty({ type: AuthUserDto }) user: AuthUserDto;
}

export class RefreshDto {
  /**
   * Token de rafraîchissement émis au login. Sans les décorateurs
   * class-validator, le `ValidationPipe({ whitelist: true,
   * forbidNonWhitelisted: true })` global rejette le payload en
   * "property refreshToken should not exist" — c'est pourquoi le
   * refresh n'a jamais fonctionné en prod jusqu'à Lot 8.
   */
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
