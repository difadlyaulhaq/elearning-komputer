# 🚀 Panduan Deployment: elearninginternasionalkomp.web.id

Panduan ini menjelaskan langkah-langkah lengkap untuk melakukan deployment aplikasi E-Learning menggunakan **Docker Compose** dan mengarahkannya ke domain `elearninginternasionalkomp.web.id` dengan SSL (HTTPS) gratis dari Let's Encrypt.

---

## 📋 Langkah 1: Persiapan Server VPS & DNS
Sebelum memulai di server, Anda harus mengarahkan domain Anda ke IP VPS.

1. **Arahkan DNS Record**:
   Masuk ke panel domain provider Anda (misalnya Niagahoster, Domainesia, Cloudflare, dll.), lalu tambahkan record berikut:
   *   **Type**: `A`
   *   **Name**: `@` atau `elearninginternasionalkomp.web.id`
   *   **Value/Target**: `IP_ADDRESS_VPS_ANDA`
   *   **TTL**: Default (misal 3600)

2. **Periksa Rambatan DNS**:
   Gunakan terminal lokal untuk memastikan domain sudah mengarah ke IP VPS Anda:
   ```bash
   ping elearninginternasionalkomp.web.id
   ```

---

## 🛠️ Langkah 2: Install Docker & Tools di VPS
Masuk ke VPS Anda via SSH (misalnya Ubuntu) dan install Docker beserta dependensinya jika belum terpasang:

```bash
# Update package list
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose Plugin
sudo apt install -y docker-compose-plugin

# Cek versi untuk memastikan sukses instalasi
docker --version
docker compose version
```

---

## 📂 Langkah 3: Clone Code & Konfigurasi `.env`
1. Unggah kode proyek Anda ke VPS menggunakan Git atau FTP.
   ```bash
   git clone <URL_REPOSITORY_ANDA> /var/www/elearning-komputer
   cd /var/www/elearning-komputer
   ```

2. Buat file `.env` produksi dari `.env.example`:
   ```bash
   cp .env.example .env
   nano .env
   ```

3. Sesuaikan variabel di dalam `.env` untuk **Produksi**:
   ```env
   # PENTING: Ubah ke "false" agar menggunakan database Firebase asli, bukan simulasi mock
   NEXT_PUBLIC_USE_MOCK="false"

   # FIREBASE CLIENT CONFIG (PUBLIC)
   NEXT_PUBLIC_FIREBASE_API_KEY="API_KEY_PRODUKSI"
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="elearning-komputer.firebaseapp.com"
   NEXT_PUBLIC_FIREBASE_PROJECT_ID="elearning-komputer"
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="elearning-komputer.appspot.com"
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="SENDER_ID_PRODUKSI"
   NEXT_PUBLIC_FIREBASE_APP_ID="APP_ID_PRODUKSI"

   # FIREBASE ADMIN SDK CONFIG (SERVER ONLY)
   FIREBASE_PROJECT_ID="elearning-komputer"
   FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxxx@elearning-komputer.iam.gserviceaccount.com"
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

   # BUNNY.NET STORAGE & CDN CONFIG (SERVER ONLY)
   BUNNY_STORAGE_ZONE_NAME="internasionalkomp-storage"
   BUNNY_STORAGE_ACCESS_KEY="PASSWORD_STORAGE_BUNNY"
   BUNNY_STORAGE_REGION="storage.bunnycdn.com"
   BUNNY_CDN_HOSTNAME="internasionalkomp-cdn.b-cdn.net"
   ```
   > [!IMPORTANT]
   > Pastikan `NEXT_PUBLIC_USE_MOCK` diset ke `"false"` agar data disimpan langsung ke Firestore database dan proses autentikasi menggunakan Firebase Auth.

---

## ⚡ Langkah 4: Jalankan Container Aplikasi
Dengan Dockerfile dan docker-compose.yml yang sudah dikonfigurasi di root project, Anda tinggal melakukan build dan menjalankan kontainer aplikasi Next.js:

```bash
# Build dan jalankan container di background
sudo docker compose up -d --build
```

Aplikasi Next.js akan berjalan di dalam docker kontainer dan diekspos secara internal pada port `3000` di localhost (`127.0.0.1:3000`). Ini dilakukan demi keamanan agar tidak bisa diakses langsung melalui port 3000 dari luar tanpa reverse proxy.

Untuk memantau log aplikasi:
```bash
sudo docker compose logs -f nextjs
```

---

## 🔒 Langkah 5: Setup Reverse Proxy & SSL (HTTPS)
Agar aplikasi dapat diakses dengan domain `elearninginternasionalkomp.web.id` dan mendukung HTTPS (SSL), pilih salah satu metode reverse proxy berikut:

### Opsi A: Menggunakan Caddy (Paling Mudah & Otomatis SSL)
Caddy sangat direkomendasikan karena ia mengonfigurasi dan memperpanjang sertifikat SSL SSL Let's Encrypt secara otomatis tanpa bantuan tools tambahan.

1. **Install Caddy**:
   ```bash
   sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
   curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
   curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
   sudo apt update
   sudo apt install caddy -y
   ```

2. **Edit Caddyfile**:
   ```bash
   sudo nano /etc/caddy/Caddyfile
   ```

3. **Isi Caddyfile dengan**:
   ```caddy
   elearninginternasionalkomp.web.id {
       reverse_proxy 127.0.0.1:3000
   }
   ```

4. **Restart & Terapkan Konfigurasi**:
   ```bash
   sudo systemctl restart caddy
   ```

---

### Opsi B: Menggunakan Nginx & Certbot (Tradisional)
Jika Anda lebih terbiasa menggunakan Nginx, ikuti langkah berikut:

1. **Install Nginx & Certbot**:
   ```bash
   sudo apt update
   sudo apt install nginx certbot python3-certbot-nginx -y
   ```

2. **Konfigurasi Server Block Nginx**:
   ```bash
   sudo nano /etc/nginx/sites-available/elearninginternasionalkomp
   ```

3. **Tempel konfigurasi berikut**:
   ```nginx
   server {
       listen 80;
       server_name elearninginternasionalkomp.web.id;

       location / {
           proxy_pass http://127.0.0.1:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

4. **Aktifkan konfigurasi & restart Nginx**:
   ```bash
   sudo ln -s /etc/nginx/sites-available/elearninginternasionalkomp /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

5. **Dapatkan Sertifikat SSL Let's Encrypt**:
   Jalankan Certbot untuk mendapatkan SSL otomatis dan memperbarui file konfigurasi Nginx:
   ```bash
   sudo certbot --nginx -d elearninginternasionalkomp.web.id
   ```
   Ikuti instruksi interaktif (masukkan email, setujui syarat, dan pilih redirect HTTP ke HTTPS).

---

## 🧪 Langkah 6: Pengujian Aplikasi
Buka browser dan kunjungi domain Anda:
👉 `https://elearninginternasionalkomp.web.id`

Pastikan:
*   Koneksi aman dengan SSL (ikon gembok menyala).
*   Fitur Login & Pendaftaran berfungsi (menandakan koneksi Firebase Auth sukses).
*   Gambar-gambar yang di-upload ke Bunny CDN termuat dengan benar (menandakan konfigurasi CORS & API upload sukses).

---

## 🪵 Perintah Berguna untuk Maintenance
Berikut kumpulan perintah Docker yang sering digunakan untuk pemeliharaan aplikasi di server VPS:

*   **Melihat log aplikasi secara real-time**:
    ```bash
    sudo docker compose logs -f nextjs
    ```
*   **Menghentikan aplikasi**:
    ```bash
    sudo docker compose down
    ```
*   **Melakukan update kode baru (Rebuild)**:
    ```bash
    git pull
    sudo docker compose up -d --build
    ```
*   **Membersihkan sisa container/image lama yang menumpuk**:
    ```bash
    sudo docker system prune -af --volumes
    ```
