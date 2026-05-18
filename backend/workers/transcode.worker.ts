import { Client } from 'pg';

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  console.log('Worker connected to database');

  process.on('SIGTERM', async () => {
    await client.end();
    process.exit(0);
  });

  console.log('Transcode worker running. Waiting for jobs...');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
