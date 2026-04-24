import { ApiProperty } from '@nestjs/swagger';
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
  refreshToken: string;
}
