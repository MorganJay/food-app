import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId } from 'class-validator';

export class ConsumerResponseDto {
    @ApiProperty({ example: '67ab12cd34ef56gh78ij90kl' })
    id: string;

    @ApiProperty({ example: 'user123' })
    userId: string;

    @ApiProperty({
        example: ['vendorId1', 'vendorId2'],
    })
    favorites: string[];

    @ApiProperty({
        example: [],
        description: 'List of order IDs or order objects depending on schema',
    })
    orderHistory: any[];

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;
}

export class ToggleFavoriteDto {
    @ApiProperty({
        example: '64f1c2a9b1234567890abcd1',
        description: 'ID of the vendor to toggle as favorite',
    })
    @IsMongoId()
    vendorId: string;
}