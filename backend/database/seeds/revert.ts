import { AppDataSource } from '../../src/database/datasource';

AppDataSource.initialize()
  .then(async (ds) => {
    await ds.query(`DELETE FROM users`);
    await ds.query(`DELETE FROM tenants`);
    console.log('Seed reverted');
    await ds.destroy();
  })
  .catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
