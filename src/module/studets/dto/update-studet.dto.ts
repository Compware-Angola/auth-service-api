import { PartialType } from '@nestjs/swagger';
import { CreateStudetDto } from './create-studet.dto';

export class UpdateStudetDto extends PartialType(CreateStudetDto) {}
