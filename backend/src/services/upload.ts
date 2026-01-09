import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

dotenv.config();

const s3 = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT || '',
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    },
});

export async function uploadFile(buffer: Buffer, key: string, contentType: string): Promise<string> {
    const bucket = process.env.R2_BUCKET_NAME || 'chess-tee-assets';
    const publicUrlBase = process.env.R2_PUBLIC_URL || '';

    try {
        await s3.send(new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: buffer,
            ContentType: contentType,
            // ACL: 'public-read' // R2 usually strictly private or public bucket setting, but headers can help
        }));

        return `${publicUrlBase}/${key}`;
    } catch (err) {
        console.error('Upload failed:', err);
        throw err;
    }
}
