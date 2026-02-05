import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module'; // ajuste se necessário
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS
  app.enableCors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Prefixo global
  app.setGlobalPrefix('api');

  // Configuração do Swagger com suporte a Bearer Token
  const config = new DocumentBuilder()
    .setTitle('🔒 Hash + JWT (Stateless)')
    .setDescription('Gera hash → JWT → verifica sem BD. Perfeito para micro-serviços!')
    .setVersion('3.0')
    // 👈 ADICIONE ESTA LINHA
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Insira o JWT token obtido no login',
        in: 'header',
      },
      'JWT-auth', // Este nome ('JWT-auth') será usado como referência nas rotas
    )
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

  const port = process.env.PORT;
  await app.listen(port as any);

  console.log(`🚀 API rodando na porta ${port}`);
  console.log(`📖 Docs Swagger: http://localhost:${port}/api/docs`);
}

bootstrap();