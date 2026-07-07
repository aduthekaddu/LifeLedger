import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import type { Express } from 'express';
import { v4 as uuid } from 'uuid';
import { env } from '../config/env';
import { badRequest, notFound } from '../utils/errors';

const allowedMimeTypes: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'text/plain': '.txt',
};

const magicNumbers: Record<string, number[]> = {
  'application/pdf': [0x25, 0x50, 0x44, 0x46],
  'image/jpeg': [0xff, 0xd8, 0xff],
  'image/png': [0x89, 0x50, 0x4e, 0x47],
};

export interface StoredFile {
  storageKey: string;
  absolutePath: string;
  checksumSha256: string;
  mimeType: string;
  size: number;
}

function hasExpectedSignature(file: Express.Multer.File): boolean {
  if (file.mimetype === 'text/plain') {
    return true;
  }

  const signature = magicNumbers[file.mimetype];
  if (!signature) {
    return false;
  }

  return signature.every((byte, index) => file.buffer[index] === byte);
}

export function validateUpload(file?: Express.Multer.File): Express.Multer.File {
  if (!file) {
    throw badRequest('A record file is required');
  }

  if (!allowedMimeTypes[file.mimetype]) {
    throw badRequest('Unsupported file type', {
      allowed: Object.keys(allowedMimeTypes),
    });
  }

  if (file.size > env.maxFileSizeBytes) {
    throw badRequest('File is too large', { maxFileSizeBytes: env.maxFileSizeBytes });
  }

  if (!hasExpectedSignature(file)) {
    throw badRequest('File content does not match the declared type');
  }

  return file;
}

export async function savePrivateFile(file: Express.Multer.File): Promise<StoredFile> {
  await fs.mkdir(env.uploadDir, { recursive: true });
  const extension = allowedMimeTypes[file.mimetype];
  const storageKey = `${uuid()}${extension}`;
  const absolutePath = path.join(env.uploadDir, storageKey);
  const checksumSha256 = crypto.createHash('sha256').update(file.buffer).digest('hex');
  await fs.writeFile(absolutePath, file.buffer, { flag: 'wx' });

  return {
    storageKey,
    absolutePath,
    checksumSha256,
    mimeType: file.mimetype,
    size: file.size,
  };
}

export async function resolveStoredFile(storageKey: string): Promise<string> {
  const absolutePath = path.join(env.uploadDir, storageKey);
  try {
    await fs.access(absolutePath);
    return absolutePath;
  } catch {
    throw notFound('Stored file not found');
  }
}
