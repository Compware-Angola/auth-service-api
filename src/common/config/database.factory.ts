import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const databaseOptionsFactory = (
  config: ConfigService,
  entitiesPath: string,
): TypeOrmModuleOptions => {
  const isSSL = config.get<string>('DB_SSL') === 'true';

  return {
    type: 'oracle' as const,
    host: config.get<string>('DB_HOST'),
    port: config.get<number>('DB_PORT', 1521),
    username: config.get<string>('DB_USERNAME'),
    password: config.get<string>('DB_PASSWORD'),
    sid: config.get<string>('DB_SID'),
    entities: [entitiesPath],
    synchronize: false,
    logging: ['query', 'error'],
    extra: {
      disableInsertDefaultValues: true,
      ...(isSSL ? { ssl: { rejectUnauthorized: true } } : {}),
    },
  };
};
