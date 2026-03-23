import express from 'express';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { randomUUID } from 'crypto';
import { spawn } from 'child_process';
import { generateTeyinatDocx, buildOutputFileName } from './teyinat-template.js';

const app = express();
const port = Number(process.env.PORT || process.env.TEYINAT_SERVICE_PORT || 3002);
const sofficeBinary = process.env.TEYINAT_SOFFICE_BINARY || process.env.SOFFICE_BINARY || 'soffice';
const allowedOrigin = process.env.TEYINAT_ALLOWED_ORIGIN || '*';

app.use(express.json({ limit: '1mb' }));

const setCorsHeaders = (response) => {
  response.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
};

app.use((request, response, next) => {
  setCorsHeaders(response);

  if (request.method === 'OPTIONS') {
    response.status(204).end();
    return;
  }

  next();
});

app.get('/health', (_request, response) => {
  response.json({ status: 'ok' });
});

const removeDirectory = async (directoryPath) => {
  await fs.rm(directoryPath, { recursive: true, force: true });
};

const convertDocxToPdf = async (docxBuffer) => {
  const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'teyinat-'));
  const baseName = randomUUID();
  const docxPath = path.join(tempDirectory, `${baseName}.docx`);
  const pdfPath = path.join(tempDirectory, `${baseName}.pdf`);
  const officeProfileDirectory = path.join(tempDirectory, 'libreoffice-profile');

  try {
    await fs.writeFile(docxPath, docxBuffer);
    await fs.mkdir(officeProfileDirectory, { recursive: true });

    await new Promise((resolve, reject) => {
      const child = spawn(
        sofficeBinary,
        [
          `-env:UserInstallation=file://${officeProfileDirectory.replace(/\\/g, '/')}`,
          '--headless',
          '--convert-to',
          'pdf',
          '--outdir',
          tempDirectory,
          docxPath,
        ],
        {
          stdio: ['ignore', 'pipe', 'pipe'],
        },
      );

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (chunk) => {
        stdout += String(chunk);
      });

      child.stderr.on('data', (chunk) => {
        stderr += String(chunk);
      });

      child.on('error', (error) => {
        reject(error);
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
          return;
        }

        reject(new Error(stderr || stdout || `LibreOffice exited with code ${code}.`));
      });
    });

    try {
      return await fs.readFile(pdfPath);
    } catch {
      throw new Error('LibreOffice did not produce a PDF file.');
    }
  } finally {
    await removeDirectory(tempDirectory);
  }
};

app.post('/teyinat/export', async (request, response) => {
  try {
    const selections = request.body?.selections;
    const docxBuffer = await generateTeyinatDocx(selections);
    const pdfBuffer = await convertDocxToPdf(docxBuffer);
    const fileName = buildOutputFileName(selections);

    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    response.status(200).send(pdfBuffer);
  } catch (error) {
    console.error(error);

    const message =
      error instanceof Error
        ? error.message
        : 'Failed to generate Teyinat PDF.';

    response.status(500).json({ message });
  }
});

app.listen(port, () => {
  console.log(`Teyinat service running on http://localhost:${port}`);
});
