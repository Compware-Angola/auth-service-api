import { NestFactory } from '@nestjs/core';
import { AppModule } from './hash.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // ✅ Permitir todas as origens CORS
  app.enableCors({
    origin: '*', // permite todas as origens
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Prefixo global
  app.setGlobalPrefix('api');


  const config = new DocumentBuilder()
    .setTitle('🔒 Hash + JWT (Stateless)')
    .setDescription('Gera hash → JWT → verifica sem BD. Perfeito para micro-serviços!')
    .setVersion('3.0')
  
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
  // Validação global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Porta
  const port = process.env.PORT ?? 3003;
  await app.listen(port);

  console.log(`🚀 API Listening on port ${port}.`);
  console.log(`📖 Swagger Docs available at ${await app.getUrl()}/api/docs`);
}
bootstrap();