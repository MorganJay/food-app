import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UtilitiesService } from './utilities.service';

@ApiTags('Utilities')
@Controller('utilities')
export class UtilitiesController {
  constructor(private readonly utilitiesService: UtilitiesService) {}

  @Post('upload-image')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Upload a single image file to receive a public URL.',
    required: true,
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
          description: 'The image file to upload.',
        },
      },
    },
  })
  @ApiOperation({
    summary: 'Upload an image (public endpoint)',
    description:
      'Upload a single image file without authentication. Returns a public URL and public ID.',
  })
  @ApiResponse({
    status: 201,
    description: 'Upload completed successfully',
  })
  @UseInterceptors(FileInterceptor('image'))
  async uploadImage(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('An image file is required.');
    }

    return this.utilitiesService.uploadImage(file);
  }
}
