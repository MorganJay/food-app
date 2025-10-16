import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);
  constructor(@InjectConnection() private readonly connection: Connection) {}

  getHello(): string {
    return 'Hello World!';
  }

  /**
   * Return DB connection health and optionally sample documents from a collection.
   * This is safe for production use because it limits the number of returned documents.
   */
  async getDb(collection?: string, limit = 5) {
    const readyState = this.connection.readyState; // 0 disconnected, 1 connected
    const dbName = this.connection?.db?.databaseName;
    const status = { ok: readyState === 1, readyState, dbName };

    // Best-effort: list databases available to the connected user/URI.
    let databases: string[] = [];
    try {
      // `db.admin().listDatabases()` is supported by the underlying driver
      // and returns an object with a `databases` array.
      const adminInfo = await this.connection.db.admin().listDatabases();
      if (Array.isArray(adminInfo?.databases)) {
        databases = adminInfo.databases.map((d: any) => d.name);
        this.logger.log('Databases visible: ' + databases.join(', '));
      }
    } catch (err) {
      // ignore - listing databases may be disallowed by user privileges in some managed clusters
      this.logger.debug(
        'Could not list databases: ' + ((err as any)?.message ?? String(err)),
      );
    }

    if (!collection)
      return {
        status,
        databases,
        sample: [],
      };

    try {
      const coll = this.connection.db.collection(collection);
      const docs = await coll.find({}).limit(limit).toArray();
      this.logger.log(
        'Sampled ' + docs.length + " docs from collection '" + collection + "'",
      );
      docs.forEach((d, i) =>
        this.logger.debug(
          collection + '[' + i + '] _id=' + d._id + ' doc=' + JSON.stringify(d),
        ),
      );
      return { status, databases, sample: docs };
    } catch (err: any) {
      this.logger.error(
        'Failed to sample collection ' +
          collection +
          ': ' +
          (err?.message ?? err),
      );
      return { status, databases, sample: [] };
    }
  }
}
