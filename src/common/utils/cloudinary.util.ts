import { BadRequestException } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

/**
 * Reusable helper to upload a single file buffer directly to Cloudinary using streams.
 * Works flawlessly with any configuration setup you already have.
 * * @param file The Express.Multer.File object from your controller
 * @param folder The target folder name in your Cloudinary account
 */
export const uploadToCloudinary = async (
  file: Express.Multer.File, 
  folder: string
): Promise<UploadApiResponse> => {
  if (!file || !file.buffer) {
    throw new BadRequestException('Invalid file upload payload: No file buffer found');
  }

  return new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (error) return reject(error);
        if (!result) return reject(new Error('Cloudinary upload failed'));
        resolve(result);
      },
    );
    stream.end(file.buffer);
  });
};

/**
 * Reusable helper to delete an asset from Cloudinary using its public_id
 */
export const deleteFromCloudinary = async (publicId: string): Promise<any> => {
  if (!publicId) return;
  return cloudinary.uploader.destroy(publicId);
};