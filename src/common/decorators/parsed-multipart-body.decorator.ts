import { createParamDecorator, ExecutionContext, BadRequestException } from '@nestjs/common';

export interface MultipartParseOptions {
  objects?: string[];
  arrays?: string[];
}

export const ParsedMultipartBody = createParamDecorator(
  (options: MultipartParseOptions, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const body = { ...request.body };

    // Parse nested JSON structures (like location)
    if (options?.objects) {
      options.objects.forEach((field) => {
        if (typeof body[field] === 'string' && body[field].trim() !== '') {
          try {
            body[field] = JSON.parse(body[field].trim());
          } catch (error) {
            throw new BadRequestException(`Malformed JSON string provided for field: ${field}`);
          }
        }
      });
    }

    // Parse stringified arrays or comma-separated tokens (like categories, workingDays)
    if (options?.arrays) {
      options.arrays.forEach((field) => {
        if (typeof body[field] === 'string' && body[field].trim() !== '') {
          const rawValue = body[field].trim();
          
          // Handle stringified JSON array formats: '["value1", "value2"]'
          if (rawValue.startsWith('[') && rawValue.endsWith(']')) {
            try {
              body[field] = JSON.parse(rawValue);
            } catch {
              body[field] = rawValue.replace(/[\[\]"]/g, '').split(',').map((item: string) => item.trim());
            }
          } else {
            // Handle raw comma-separated lists: 'value1,value2'
            body[field] = rawValue.split(',').map((item: string) => item.trim());
          }
        } else if (body[field] === '') {
          body[field] = [];
        }
      });
    }

    return body;
  },
);