import dotenv from 'dotenv';
import path from 'path';

// Load env from rationsWeb/server/.env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Immediate validation
if (!process.env.MONGODB_URI) {
  console.error("FATAL: MONGODB_URI not loaded from rationsWeb/server/.env");
  process.exit(1);
}
