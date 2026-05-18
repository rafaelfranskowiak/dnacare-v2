import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  type: 'postgres' as const,
  url: process.env.DATABASE_URL,
  autoLoadEntities: true,
  synchronize: false,
  migrations: ['dist/database/migrations/*.js'],
  migrationsRun: false,
  logging: process.env.NODE_ENV !== 'production',
}));
