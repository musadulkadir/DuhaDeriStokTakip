// AWS S3 Backup Module (Windows için çalışır)
const { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

class S3Backup {

  // S3Backup class içine ekleyin
async isBackupNeededToday() {
  const lastBackupFile = path.join(this.backupFolder, 'last-backup.txt');

  if (!fs.existsSync(lastBackupFile)) return true;

  const lastBackup = fs.readFileSync(lastBackupFile, 'utf8');
  const lastBackupDate = new Date(lastBackup);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  lastBackupDate.setHours(0, 0, 0, 0);

  return today > lastBackupDate; // true → bugünkü yedek yapılmamış
}

// Son yedekleme tarihini kaydetmek için
async saveLastBackupDate() {
  const lastBackupFile = path.join(this.backupFolder, 'last-backup.txt');
  fs.writeFileSync(lastBackupFile, new Date().toISOString());
}

  constructor() {
    this.s3Client = null;
    this.bucketName = process.env.AWS_BUCKET_NAME || 'duha-deri-backups';
    this.region = process.env.AWS_REGION || 'eu-central-1'; // Frankfurt
    this.maxBackups = 30; // Son 30 günü tut
    
    // Windows için: C:\Users\Public\duha_deri_backups
    this.backupFolder = path.join('C:', 'Users', 'Public', 'duha_deri_backups');

    if (!fs.existsSync(this.backupFolder)) {
      fs.mkdirSync(this.backupFolder, { recursive: true });
    }
  }

  async initialize() {
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    if (!accessKeyId || !secretAccessKey) {
      throw new Error('AWS credentials bulunamadı. .env dosyasını kontrol edin.');
    }

    this.s3Client = new S3Client({
      region: this.region,
      credentials: { accessKeyId, secretAccessKey }
    });

    console.log('✅ AWS S3 bağlantısı başarılı');
    return true;
  }

  async createDatabaseBackup() {
    return new Promise((resolve, reject) => {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `duha_deri_backup_${timestamp}.sql`;
      const backupPath = path.join(this.backupFolder, backupFileName);

      const dbHost = process.env.DB_HOST || 'localhost';
      const dbPort = process.env.DB_PORT || '5432';
      const dbName = process.env.DB_NAME || 'duha_deri_db';
      const dbUser = process.env.DB_USER || 'postgres';
      const dbPassword = process.env.DB_PASSWORD || '';

      // Windows için pg_dump tam yolu
      const pgDumpPath = `"C:\\Program Files\\PostgreSQL\\16\\bin\\pg_dump.exe"`; 

      const command = `${pgDumpPath} -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -F c -f "${backupPath}"`;

      const env = { ...process.env };
      if (dbPassword) env.PGPASSWORD = dbPassword;

      console.log('📦 Veritabanı yedeği oluşturuluyor...');

      exec(command, { env }, (error, stdout, stderr) => {
        if (error) {
          console.error('❌ Yedekleme hatası:', error.message);
          reject(error);
          return;
        }

        if (stderr && !stderr.includes('WARNING')) {
          console.warn('⚠️ Yedekleme uyarısı:', stderr);
        }

        console.log('✅ Veritabanı yedeği oluşturuldu:', backupPath);
        resolve({ backupPath, backupFileName });
      });
    });
  }

  async uploadToS3(backupPath, backupFileName) {
    try {
      console.log('☁️ Yedek AWS S3\'e yükleniyor...');
      const fileContent = fs.readFileSync(backupPath);
      const key = `backups/${backupFileName}`;

      await this.s3Client.send(new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: fileContent,
        ContentType: 'application/sql',
        Metadata: {
          uploadDate: new Date().toISOString(),
          source: 'duha-deri-app'
        }
      }));

      console.log('✅ Yedek AWS S3\'e yüklendi:', key);

      fs.unlinkSync(backupPath);
      console.log('🗑️ Yerel yedek dosyası silindi');

      return key;
    } catch (error) {
      console.error('❌ S3\'e yükleme hatası:', error.message);
      throw error;
    }
  }

  async cleanOldBackups() {
    try {
      console.log('🧹 Eski yedekler temizleniyor...');
      const listCommand = new ListObjectsV2Command({ Bucket: this.bucketName, Prefix: 'backups/' });
      const response = await this.s3Client.send(listCommand);
      const files = response.Contents || [];

      if (files.length <= this.maxBackups) return;

      files.sort((a, b) => new Date(a.LastModified) - new Date(b.LastModified));
      const filesToDelete = files.slice(0, files.length - this.maxBackups);

      for (const file of filesToDelete) {
        await this.s3Client.send(new DeleteObjectCommand({ Bucket: this.bucketName, Key: file.Key }));
        console.log(`🗑️ Eski yedek silindi: ${file.Key}`);
      }

      console.log(`✅ ${filesToDelete.length} eski yedek temizlendi`);
    } catch (error) {
      console.error('❌ Eski yedekleri temizleme hatası:', error.message);
    }
  }

  async performBackup(onProgress) {
    try {
      if (onProgress) onProgress('AWS S3 bağlantısı kuruluyor...', 10);
      await this.initialize();

      if (onProgress) onProgress('Veritabanı yedeği oluşturuluyor...', 30);
      const { backupPath, backupFileName } = await this.createDatabaseBackup();

      if (onProgress) onProgress('Yedek AWS S3\'e yükleniyor...', 60);
      await this.uploadToS3(backupPath, backupFileName);

      if (onProgress) onProgress('Eski yedekler temizleniyor...', 90);
      await this.cleanOldBackups();

      if (onProgress) onProgress('Yedekleme tamamlandı!', 100);
      return { success: true, message: 'Yedekleme başarıyla tamamlandı', fileName: backupFileName };
    } catch (error) {
      console.error('❌ Yedekleme işlemi başarısız:', error);
      return { success: false, message: error.message, error };
    }
  }
}

module.exports = S3Backup;
