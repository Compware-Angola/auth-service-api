import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsOptional } from "class-validator";
import { PaginationQueryDto } from "src/common/dtos/pagination-query.dto";

export class FindAllIdentitiesDto extends PaginationQueryDto {

    @ApiProperty({
        example: 1,
        description: 'Status',
        required: false,
    })
    @IsOptional()
    @IsNumber()
    status: number;

}