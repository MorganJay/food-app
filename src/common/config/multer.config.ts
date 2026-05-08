import { diskStorage } from 'multer';
import { extname } from 'path';

export const multerConfig = (folder: string) => ({
    storage: diskStorage({
        destination: `./uploads/${folder}`,
        filename: (req, file, cb) => {
            const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9); // unique file name - 668861102-791102780.PNG
            cb(null, uniqueName + extname(file.originalname));
        },
    }),
    limits: {
        fileSize: 2 * 1024 * 1024, // 2mb
    }
})