import { AppModule } from './app.module';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.setGlobalPrefix('api/v1');

  const config = new DocumentBuilder()
    .setTitle('Chopbaze API')
    .setDescription('API documentation for the Chopbaze App')
    .setVersion('1.0')
    .addTag('Chopbaze')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter access Token',
        in: 'header',
      },
      'jwt',
    )
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  // SwaggerModule.setup('swagger', app, documentFactory);

  SwaggerModule.setup('swagger', app, documentFactory, {
    jsonDocumentUrl: 'swagger/json',
    customSiteTitle: 'Chopbaze API Docs',
  });

  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  app.use('/docs', (_req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Chopbaze APIs v1</title>

        <meta property="og:title" content="Chopbaze APIs v1" />
        <meta property="og:description" content="Official API documentation for Chopbaze" />
        <meta property="og:url" content="${process.env.BASE_URL}/docs" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://yourdomain.com/preview.png" />

        <meta name="twitter:card" content="summary_large_image" />
      </head>
      <body>
        <script>
          window.location.href = '/swagger';
        </script>
      </body>
    </html>
  `);
  });

  await app.listen(process.env.PORT ?? 3000);
  console.log(`Application is running on: ${await app.getUrl()}}`);
}
bootstrap();
