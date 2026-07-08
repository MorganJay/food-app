import { BadRequestException, Injectable } from '@nestjs/common';
import { uploadToCloudinary } from '../common/utils/cloudinary.util';

@Injectable()
export class UtilitiesService {
  async uploadImage(file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('An image file is required.');
    }

    const result = await uploadToCloudinary(file, 'images');
    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  }
}
