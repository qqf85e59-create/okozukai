import { writeFile, mkdir, unlink, stat } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

const UPLOAD_DIR = join(process.cwd(), "public", "uploads");

/** Ensure upload directory exists */
async function ensureDir() {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }
}

/**
 * Storage abstraction layer.
 * Currently saves to local filesystem (public/uploads/).
 * Can be swapped to S3/R2 compatible storage in the future.
 */
export const storage = {
  /**
   * Save a file buffer and return the relative URL.
   */
  async save(fileName: string, buffer: Buffer, _mimeType: string): Promise<string> {
    await ensureDir();
    const filePath = join(UPLOAD_DIR, fileName);
    await writeFile(filePath, buffer);
    return `/uploads/${fileName}`;
  },

  /**
   * Delete a file by its relative URL.
   */
  async remove(url: string): Promise<void> {
    const filePath = join(process.cwd(), "public", url);
    try {
      await unlink(filePath);
    } catch {
      // File may not exist; ignore
    }
  },

  /**
   * Get total storage used by a user (in bytes) from DB records.
   */
  async getUserStorageBytes(userId: string, prismaClient: { attachment: { aggregate: (args: { where: { request: { userId: string } }; _sum: { byteSize: true } }) => Promise<{ _sum: { byteSize: number | null } }> } }): Promise<number> {
    const result = await prismaClient.attachment.aggregate({
      where: { request: { userId } },
      _sum: { byteSize: true },
    });
    return result._sum.byteSize ?? 0;
  },

  /** Max storage per user: 50MB */
  MAX_USER_BYTES: 50 * 1024 * 1024,

  /** Max file size: 5MB */
  MAX_FILE_BYTES: 5 * 1024 * 1024,

  /** Max files per request */
  MAX_FILES_PER_REQUEST: 3,
};
