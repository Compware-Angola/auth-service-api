import { NestFactory } from '@nestjs/core';
import { AppModule } from './hash.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  const config = new DocumentBuilder()
    .setTitle('🔒 Hash + JWT (Stateless)')
    .setDescription('Gera hash → JWT → verifica sem BD. Perfeito para micro-serviços!')
    .setVersion('3.0')
    .addTag('hash')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    customSiteTitle: 'Hash JWT API',
    swaggerOptions: { docExpansion: 'none', filter: true },
  });

  const port = process.env.PORT || 3003
  await app.listen(port);
  console.log(`🚀 http://localhost:3000`);
  console.log(`📚 Swagger: http://localhost:3000/api`);
}
bootstrap();