import { Module } from '@nestjs/common';

import { HashService } from './hash.service';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from './jwt.constants';
import { HashController } from './hash.controller';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '15m' },
    }),
  ],
  controllers: [HashController],
  providers: [HashService],
})
export class AppModule {}