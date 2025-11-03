// AWS S3 Backup Module
const { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

class S3Backup {
  constructor() {
    this.s3Client = null;
    this.bucketName = process.env.AWS_BUCKET_NAME || 'duha-deri-backups';
    this.region = process.env.AWS_REGION || 'eu-central-1'; // Frankfurt
    this.maxBackups = 30; // Son 30 günü tut
    this.backupFolder = path.join(os.homedir(), '.duha-deri-backups');
    
    // Backup klasörünü oluştur
    if (!fs.existsSync(this.backupFolder)) {
      fs.mkdirSync(this.backupFolder, { recursive: true });
    }
  }

  // AWS S3'ü başlat
  async initialize() {
    try {
      const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
      const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

      if (!accessKeyId || !secretAccessKey) {
        throw new Error('AWS credentials bulunamadı. .env dosyasını kontrol edin.');
      }

      this.s3Client = new S3Client({
        region: this.region,
        credentials: {
          accessKeyId,
          secretAccessKey
        }
      });

      console.log('✅ AWS S3 bağlantısı başarılı');
      return true;
    } catch (error) {
      console.error('❌ AWS S3 başlatma hatası:', error.message);
      throw error;
    }
  }

  // PostgreSQL veritabanını yedekle
  async createDatabaseBackup() {
    return new Promise((resolve, reject) => {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `duha_deri_backup_${timestamp}.sql`;
      const backupPath = path.join(this.backupFolder, backupFileName);

      const dbHost = process.env.DB_HOST || 'localhost';
      const dbPort = process.env.DB_PORT || '5432';
      const dbName = process.env.DB_NAME || 'duha_deri_db';
      const dbUser = process.env.DB_USER || os.userInfo().username;
      const dbPassword = process.env.DB_PASSWORD || '';

      // pg_dump komutu
      const command = `pg_dump -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -F c -f "${backupPath}"`;

      // Windows için PGPASSWORD environment variable
      const env = { ...process.env };
      if (dbPassword) {
        env.PGPASSWORD = dbPassword;
      }

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

  // Yedeği AWS S3'e yükle
  async uploadToS3(backupPath, backupFileName) {
    try {
      console.log('☁️ Yedek AWS S3\'e yükleniyor...');
      
      const fileContent = fs.readFileSync(backupPath);
      const key = `backups/${backupFileName}`;

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: fileContent,
        ContentType: 'application/sql',
        Metadata: {
          uploadDate: new Date().toISOString(),
          source: 'duha-deri-app'
        }
      });

      await this.s3Client.send(command);

      console.log('✅ Yedek AWS S3\'e yüklendi:', key);
      
      // Yerel dosyayı sil
      fs.unlinkSync(backupPath);
      console.log('🗑️ Yerel yedek dosyası silindi');

      return key;
    } catch (error) {
      console.error('❌ S3\'e yükleme hatası:', error.message);
      throw error;
    }
  }

  // Eski yedekleri temizle (30 günden eski)
  async cleanOldBackups() {
    try {
      console.log('🧹 Eski yedekler temizleniyor...');
      
      const listCommand = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: 'backups/'
      });

      const response = await this.s3Client.send(listCommand);
      const files = response.Contents || [];

      if (files.length <= this.maxBackups) {
        console.log(`✅ Toplam ${files.length} yedek var, temizlik gerekmiyor`);
        return;
      }

      // Tarihe göre sırala (en eski en başta)
      files.sort((a, b) => {
        return new Date(a.LastModified) - new Date(b.LastModified);
      });

      // Fazla olanları sil
      const filesToDelete = files.slice(0, files.length - this.maxBackups);
      
      for (const file of filesToDelete) {
        const deleteCommand = new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: file.Key
        });
        
        await this.s3Client.send(deleteCommand);
        console.log(`🗑️ Eski yedek silindi: ${file.Key}`);
      }

      console.log(`✅ ${filesToDelete.length} eski yedek temizlendi`);
    } catch (error) {
      console.error('❌ Eski yedekleri temizleme hatası:', error.message);
      // Hata olsa bile devam et
    }
  }

  // Tam yedekleme işlemi
  async performBackup(onProgress) {
    try {
      // 1. AWS S3'ü başlat
      if (onProgress) onProgress('AWS S3 bağlantısı kuruluyor...', 10);
      await this.initialize();

      // 2. Veritabanı yedeğini oluştur
      if (onProgress) onProgress('Veritabanı yedeği oluşturuluyor...', 30);
      const { backupPath, backupFileName } = await this.createDatabaseBackup();

      // 3. S3'e yükle
      if (onProgress) onProgress('Yedek AWS S3\'e yükleniyor...', 60);
      await this.uploadToS3(backupPath, backupFileName);

      // 4. Eski yedekleri temizle
      if (onProgress) onProgress('Eski yedekler temizleniyor...', 90);
      await this.cleanOldBackups();

      if (onProgress) onProgress('Yedekleme tamamlandı!', 100);
      
      return {
        success: true,
        message: 'Yedekleme başarıyla tamamlandı',
        fileName: backupFileName
      };
    } catch (error) {
      console.error('❌ Yedekleme işlemi başarısız:', error);
      return {
        success: false,
        message: error.message,
        error: error
      };
    }
  }

  // Son yedekleme tarihini kontrol et
  async getLastBackupDate() {
    try {
      const lastBackupFile = path.join(this.backupFolder, 'last-backup.txt');
      
      if (fs.existsSync(lastBackupFile)) {
        const lastBackup = fs.readFileSync(lastBackupFile, 'utf8');
        return new Date(lastBackup);
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  // Son yedekleme tarihini kaydet
  async saveLastBackupDate() {
    try {
      const lastBackupFile = path.join(this.backupFolder, 'last-backup.txt');
      fs.writeFileSync(lastBackupFile, new Date().toISOString());
    } catch (error) {
      console.error('Son yedekleme tarihi kaydedilemedi:', error);
    }
  }

  // Bugün yedekleme yapıldı mı?
  async isBackupNeededToday() {
    const lastBackup = await this.getLastBackupDate();
    
    if (!lastBackup) {
      return true; // Hiç yedekleme yapılmamış
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const lastBackupDate = new Date(lastBackup);
    lastBackupDate.setHours(0, 0, 0, 0);

    return today > lastBackupDate; // Bugün yedekleme yapılmamışsa true
  }
}

module.exports = S3Backup;
