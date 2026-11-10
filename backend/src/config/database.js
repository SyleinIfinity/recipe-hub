import mongoose from 'mongoose';

export function createDatabase(config) {
  const connection = mongoose.createConnection();
  return {
    connection,
    async connect() {
      await connection.openUri(config.MONGODB_URI, {
        dbName: config.DB_NAME,
        serverSelectionTimeoutMS: config.DB_TIMEOUT_MS,
        connectTimeoutMS: config.DB_TIMEOUT_MS,
        socketTimeoutMS: config.DB_TIMEOUT_MS,
        heartbeatFrequencyMS: 1000,
        maxPoolSize: 10,
        autoIndex: config.NODE_ENV !== 'production',
      });
    },
    async isReady() {
      if (connection.readyState !== 1) return false;
      try {
        await connection.db
          .admin()
          .command({ ping: 1 }, { timeoutMS: config.DB_TIMEOUT_MS });
        return true;
      } catch {
        return false;
      }
    },
    async close() {
      await connection.close();
    },
  };
}
