const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const inputDir = path.join(__dirname, '../firebase_backup/videos');
const outputDir = path.join(__dirname, '../firebase_backup/videos_compressed');

if (!fs.existsSync(inputDir)) {
  console.error(`❌ Folder input video tidak ditemukan di: ${inputDir}`);
  process.exit(1);
}

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Ambil semua file video (.mp4)
const files = fs.readdirSync(inputDir).filter(file => file.toLowerCase().endsWith('.mp4'));

if (files.length === 0) {
  console.log('📂 Tidak ada file video (.mp4) ditemukan di folder backup.');
  process.exit(0);
}

console.log(`🎬 Ditemukan ${files.length} video untuk dikompres.`);
console.log(`📂 Output folder: ${outputDir}\n`);

let currentIndex = 0;

function compressNext() {
  if (currentIndex >= files.length) {
    console.log('\n🎉 SEMUA VIDEO BERHASIL DIKOMPRES!');
    console.log(`💡 Langkah selanjutnya:`);
    console.log(`   1. Hapus isi folder 'firebase_backup/videos'`);
    console.log(`   2. Pindahkan seluruh file dari 'firebase_backup/videos_compressed' ke 'firebase_backup/videos'`);
    console.log(`   3. Jalankan kembali script upload: node scripts/upload-backup-to-bunny.js`);
    process.exit(0);
  }

  const fileName = files[currentIndex];
  const inputFilePath = path.join(inputDir, fileName);
  const outputFilePath = path.join(outputDir, fileName);

  const stats = fs.statSync(inputFilePath);
  const originalSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

  // Skip jika sudah dikompres sebelumnya di folder output
  if (fs.existsSync(outputFilePath)) {
    const outStats = fs.statSync(outputFilePath);
    if (outStats.size > 0) {
      console.log(`[${currentIndex + 1}/${files.length}] ⏭️ Skipping ${fileName} (Sudah dikompres: ${(outStats.size / (1024 * 1024)).toFixed(2)} MB)`);
      currentIndex++;
      compressNext();
      return;
    }
  }

  console.log(`[${currentIndex + 1}/${files.length}] Mengompres: ${fileName} (${originalSizeMB} MB)...`);

  // Perintah FFmpeg Optimal (Super Cepat): 
  // -vcodec libx264: codec standar kompatibel dengan semua browser
  // -crf 24: Kualitas visual sangat baik (18-28 rentang normal, 24 sangat optimal & efisien)
  // -preset ultrafast: Menggunakan preset tercepat untuk memangkas waktu kompresi secara drastis (hingga 5x-10x lebih cepat)
  // -acodec aac -b:a 128k: Kompresi audio standar berkualitas tinggi
  const ffmpegCmd = `ffmpeg -y -i "${inputFilePath}" -vcodec libx264 -crf 24 -preset ultrafast -acodec aac -b:a 128k "${outputFilePath}"`;

  const startTime = Date.now();

  exec(ffmpegCmd, (error, stdout, stderr) => {
    if (error) {
      console.error(`❌ Gagal mengompres "${fileName}":`, error.message);
    } else {
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      const outStats = fs.statSync(outputFilePath);
      const compressedSizeMB = (outStats.size / (1024 * 1024)).toFixed(2);
      const savedPercent = ((1 - (outStats.size / stats.size)) * 100).toFixed(1);

      console.log(`✅ Sukses dalam ${duration} detik!`);
      console.log(`   Sebelum: ${originalSizeMB} MB | Sesudah: ${compressedSizeMB} MB (Hemat ${savedPercent}%)`);
    }

    currentIndex++;
    compressNext();
  });
}

// Mulai kompresi
compressNext();
