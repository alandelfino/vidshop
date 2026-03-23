import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { s3Client } from './upload.js';
import { PutObjectCommand } from '@aws-sdk/client-s3';

// FFmpeg Configuration
// On Render/Production, it's better to use the system ffmpeg if available.
// The static binaries in @ffmpeg-installer can sometimes SIGSEGV in certain environments.
const ffmpegPath = ffmpegInstaller.path || (ffmpegInstaller as any).default?.path;
const ffprobePath = ffprobeInstaller.path || (ffprobeInstaller as any).default?.path;

if (process.env.NODE_ENV === 'production') {
    // On production, we try to use system binaries if they exist.
    // If not, we fall back to the installers.
    console.log("[ffmpeg] Production environment detected. Using system paths if available.");
} else {
    if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath);
    if (ffprobePath) ffmpeg.setFfprobePath(ffprobePath);
}

export async function extractFramesToR2(videoUrl: string): Promise<string[]> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "vidshop-frames-"));
  
  return new Promise((resolve, reject) => {
    ffmpeg(videoUrl)
      .screenshots({
        count: 5,
        folder: tmpDir,
        filename: 'thumbnail-at-%i.jpg',
        size: '640x?'
      })
      .on('end', async () => {
        try {
          const files = await fs.readdir(tmpDir);
          const urls: string[] = [];
          const bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME;
          const publicDomain = process.env.CLOUDFLARE_R2_PUBLIC_DOMAIN;
          
          if (!bucket) throw new Error("CLOUDFLARE_R2_BUCKET_NAME not set");

          for (const file of files) {
            const filePath = path.join(tmpDir, file);
            const buffer = await fs.readFile(filePath);
            const key = `thumbnails/${uuidv4()}.jpg`;
            
            await s3Client.send(new PutObjectCommand({
              Bucket: bucket,
              Key: key,
              Body: buffer,
              ContentType: 'image/jpeg',
            }));
            
            const finalUrl = publicDomain 
              ? `${publicDomain.replace(/\/$/, '')}/${key}`
              : `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com/${bucket}/${key}`;
              
            urls.push(finalUrl);
          }
          
          // Cleanup
          for (const file of files) {
            await fs.unlink(path.join(tmpDir, file));
          }
          await fs.rmdir(tmpDir);
          
          resolve(urls);
        } catch(e) {
          reject(e);
        }
      })
      .on('error', async (err: any) => {
        try {
          const files = await fs.readdir(tmpDir).catch(() => []);
          for (const file of files) await fs.unlink(path.join(tmpDir, file)).catch(() => {});
          await fs.rmdir(tmpDir).catch(() => {});
        } catch (e) {}
        reject(err);
      });
  });
}
