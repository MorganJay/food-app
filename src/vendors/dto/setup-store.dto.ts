import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsArray, IsOptional, IsString } from "class-validator";

export class SetupStoreDto {
  @ApiProperty({ example: ['Monday', 'Tuesday', 'Wednesday'] })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return [value];
      }
    }
    return value;
  })
  @IsArray()
  @IsString({ each: true })
  workingDays: string[];

  @ApiProperty({ example: 'delivery', required: false })
  @IsString()
  @IsOptional()
  orderType?: string;

  @ApiProperty({ type: 'string', format: 'binary', description: 'Store banner image file' })
  image?: any;
}