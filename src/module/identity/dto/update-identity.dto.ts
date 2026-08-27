import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateIdentityDto } from './create-identity.dto';

/**
 * A senha não é actualizável por esta rota genérica — precisa de um
 * fluxo dedicado (fora do escopo actual), tal como acontece no Auth
 * existente (update-password é um endpoint próprio).
 */
export class UpdateIdentityDto extends PartialType(
  OmitType(CreateIdentityDto, ['password'] as const),
) {}
