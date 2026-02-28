import oracledb from 'oracledb';
import type { DatabaseEndpoint, ApiHealthCheck, ApiStatus } from '@/types';

// Configure oracledb for better performance
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
oracledb.autoCommit = true;

export async function checkDatabaseHealth(
  endpoint: DatabaseEndpoint,
  username: string,
  password: string
): Promise<ApiHealthCheck> {
  const startTime = performance.now();
  const timestamp = new Date().toISOString();
  
  let connection;

  try {
    // Create connection configuration
    const connectionConfig = {
      user: username,
      password: password,
      connectString: `${endpoint.host}:${endpoint.port}/${endpoint.serviceName}`,
      connectionTimeout: endpoint.timeout / 1000, // Convert ms to seconds
    };

    // Attempt to connect to Oracle database
    connection = await oracledb.getConnection(connectionConfig);

    // Execute a simple query to verify connection
    const result = await connection.execute('SELECT 1 FROM DUAL');

    await connection.close();

    const endTime = performance.now();
    const responseTime = Math.round(endTime - startTime);

    return {
      endpointId: endpoint.id,
      status: 'up' as ApiStatus,
      responseTime,
      statusCode: 200,
      timestamp,
      responseData: {
        database: {
          connected: true,
          type: 'oracle',
          host: endpoint.host,
          serviceName: endpoint.serviceName,
        },
        query: result.rows,
      },
      databaseConnected: true,
    };
  } catch (error) {
    // Ensure connection is closed on error
    if (connection) {
      try {
        await connection.close();
      } catch (closeError) {
        console.error('Error closing connection:', closeError);
      }
    }

    const endTime = performance.now();
    const responseTime = Math.round(endTime - startTime);

    let errorMessage = 'Unknown database error';
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return {
      endpointId: endpoint.id,
      status: 'down' as ApiStatus,
      responseTime,
      timestamp,
      error: errorMessage,
      databaseConnected: false,
      databaseError: errorMessage,
    };
  }
}
