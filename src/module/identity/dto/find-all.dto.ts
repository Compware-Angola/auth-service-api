import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsNumber, IsOptional, IsString } from "class-validator";
import { PaginationQueryDto } from "src/common/dtos/pagination-query.dto";

export class FindAllIdentitiesDto extends PaginationQueryDto {

    @ApiProperty({
        example: 1,
        description: 'Status',
        required: false,
    })
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    status: number;

    @ApiProperty({
        example: 'GA',
        description: 'Platform code',
        required: false,
    })
    @IsOptional()
    @IsString()
    platformCode: string;
}