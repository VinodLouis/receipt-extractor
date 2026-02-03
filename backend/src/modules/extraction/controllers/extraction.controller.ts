import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  NotFoundException,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ExtractionService } from '../services/extraction.service';

@Controller('api/extractions')
export class ExtractionController {
  constructor(private readonly extractionService: ExtractionService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
      fileFilter: (req, file, cb) => {
        const allowedMimes = [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/webp',
        ];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              'Invalid file type. Only JPEG, JPG, PNG, and WebP are allowed.',
            ),
            false,
          );
        }
      },
    }),
  )
  async createExtraction(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    return this.extractionService.createExtraction(file, req['userId']);
  }

  @Get()
  async getExtractions(@Req() req: Request) {
    return this.extractionService.getExtractionsByUser(req['userId']);
  }

  @Get(':id')
  async getExtraction(@Param('id') id: string, @Req() req: Request) {
    const extraction = await this.extractionService.getExtractionById(
      id,
      req['userId'],
    );
    if (!extraction) {
      throw new NotFoundException('Extraction not found');
    }
    return extraction;
  }

  @Delete(':id')
  async deleteExtraction(@Param('id') id: string, @Req() req: Request) {
    await this.extractionService.deleteExtraction(id, req['userId']);
    return { message: 'Extraction deleted successfully' };
  }
}
