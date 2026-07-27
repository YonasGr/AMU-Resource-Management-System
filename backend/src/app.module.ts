import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { validateEnv } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    // Feature modules (Auth, Organization, Store, etc.) will be registered here
    // as we build them in Phase 1 onward.
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
