import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    username: string;

    @ApiProperty()
    email: string;

    @ApiProperty()
    phoneNumber: string;

    @ApiProperty()
    isPhoneVerified: boolean;

    @ApiProperty()
    role: string;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;
}