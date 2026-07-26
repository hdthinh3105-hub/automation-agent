import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { appConfig, databaseConfig, jwtConfig, redisConfig, throttleConfig, storageConfig } from './configuration';
import { validateEnv } from './env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
      validate: validateEnv,
      load: [appConfig, databaseConfig, redisConfig, jwtConfig, throttleConfig, storageConfig],
    }),
  ],
})
export class AppConfigModule {}
