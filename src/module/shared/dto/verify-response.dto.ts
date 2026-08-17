import { ApiProperty } from '@nestjs/swagger';

export class VerifyResponse {
  @ApiProperty({ example: true })
  valido: boolean;
}
