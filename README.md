# Portoweb - Personal Portfolio & Guestbook System

Portoweb adalah aplikasi website portofolio pribadi yang dilengkapi dengan sistem buku tamu (guestbook) dan Dashboard Admin untuk mengelola data secara dinamis. Aplikasi ini menggunakan Python (Flask) sebagai backend, MySQL sebagai database, serta HTML, CSS, dan Vanilla JavaScript di sisi frontend.

---

## Struktur Direktori

Berikut adalah struktur direktori utama proyek:

*   `app.py`: Berkas utama backend Flask yang berisi konfigurasi database, inisialisasi schema database, routing halaman, dan endpoint API RESTful.
*   `requirements.txt`: Daftar pustaka Python yang dibutuhkan oleh proyek ini.
*   `templates/`: Berkas template HTML (menggunakan Jinja2):
    *   `base.html`: Tata letak (layout) dasar dan navigasi navigasi situs.
    *   `home.html`: Tampilan halaman utama.
    *   `profile.html`: Halaman informasi profil/biodata diri serta daftar keahlian (skills).
    *   `portfolio.html`: Halaman yang menampilkan galeri proyek portofolio.
    *   `message.html`: Halaman buku tamu bagi pengunjung untuk mengirimkan pesan.
    *   `admin.html`: Halaman panel admin untuk mengelola seluruh konten situs.
*   `css/`: Berisi berkas stylesheet styling aplikasi.
    *   `style.css`: Berkas stylesheet utama.
*   `js/`: Logika interaksi frontend menggunakan Vanilla JavaScript:
    *   `script.js`: Menangani pengambilan (fetching) API dan manipulasi DOM untuk halaman publik (Home, Profile, Portfolio, Message).
    *   `admin.js`: Menangani proses autentikasi admin dan operasi CRUD (Create, Read, Update, Delete) pada dashboard admin.
*   `src/`: Aset statis seperti ikon media sosial (`LinkedIn_2021.svg`) dan foto profil (`photo.jpg`).
*   `uploads/`: Direktori lokal tempat menyimpan berkas gambar proyek yang diunggah oleh admin.

---

## Spesifikasi & Fitur yang Ada

### 1. Database & Skema Tabel
Sistem menggunakan MySQL (default konfigurasi XAMPP) dengan database bernama `portodb` yang otomatis dibuat jika belum ada saat aplikasi dijalankan.

Tabel-tabel database yang otomatis diinisialisasi meliputi:
*   **`profile_content`**: Menyimpan deskripsi/biodata profil.
    *   Kolom: `id` (PK), `description`, `updated_at`.
    *   *Seeding*: Menyertakan deskripsi default saat pertama kali diinisialisasi.
*   **`skills`**: Menyimpan data keahlian.
    *   Kolom: `id` (PK), `category` (Technical / Soft), `name`, `created_at`.
*   **`projects`**: Menyimpan data proyek portofolio.
    *   Kolom: `id` (PK), `title`, `description`, `image_url`, `github_url`, `created_at`.
*   **`messages`**: Menyimpan pesan kiriman pengunjung dari halaman buku tamu.
    *   Kolom: `id` (PK), `nama`, `email`, `no_telepon`, `pesan`, `created_at`.

### 2. Autentikasi Admin
*   Akses ke panel admin dilindungi oleh passcode.
*   Operasi perubahan data (PUT, POST, DELETE) pada endpoint admin memvalidasi header request `X-Admin-Passcode`.

### 3. API Endpoints
Aplikasi menyediakan REST API dengan format respon JSON berikut:

*   **Autentikasi**
    *   `POST /api/admin/login` - Memvalidasi passcode admin.
*   **Profil**
    *   `GET /api/profile-content` - Mengambil teks deskripsi profil.
    *   `PUT /api/profile-content` - Memperbarui deskripsi profil (Memerlukan autentikasi admin).
*   **Unggah Gambar**
    *   `POST /api/upload` - Mengunggah gambar proyek ke folder lokal `/uploads/` dengan penambahan timestamp unik pada nama file (Memerlukan autentikasi admin).
*   **Proyek Portofolio**
    *   `GET /api/projects` - Mendapatkan seluruh daftar proyek.
    *   `POST /api/projects` - Menambahkan proyek baru (Memerlukan autentikasi admin).
    *   `PUT /api/projects/<id>` - Memperbarui data proyek tertentu dan menghapus berkas gambar lama yang tersimpan secara lokal jika diganti (Memerlukan autentikasi admin).
    *   `DELETE /api/projects/<id>` - Menghapus proyek beserta berkas gambar fisiknya dari lokal (Memerlukan autentikasi admin).
*   **Keahlian (Skills)**
    *   `GET /api/skills` - Mendapatkan seluruh keahlian yang terbagi berdasarkan kategori.
    *   `POST /api/skills` - Menambahkan keahlian baru (Memerlukan autentikasi admin).
    *   `DELETE /api/skills/<id>` - Menghapus keahlian tertentu (Memerlukan autentikasi admin).
*   **Buku Tamu / Pesan**
    *   `GET /api/messages` - Mendapatkan seluruh daftar pesan masuk.
    *   `POST /api/messages` - Mengirim/menyimpan pesan baru dari pengunjung.
    *   `PUT /api/messages/<id>` - Memperbarui isi pesan.
    *   `DELETE /api/messages/<id>` - Menghapus pesan tertentu.

### 4. Routing Halaman (Web Views)
Flask menyajikan rute halaman menggunakan template Jinja2:
*   `/` -> Menampilkan Halaman Utama (`home.html`).
*   `/profile` -> Menampilkan Halaman Profil/Keahlian (`profile.html`).
*   `/portfolio` -> Menampilkan Galeri Proyek (`portfolio.html`).
*   `/message` -> Menampilkan Halaman Hubungi Kami/Buku Tamu (`message.html`).
*   `/admin` -> Menampilkan Dashboard Pengelolaan Admin (`admin.html`).

---

## Cara Menjalankan Aplikasi

### Prasyarat
1.  Python 3.x terinstal di komputer.
2.  MySQL Server (misalnya menggunakan XAMPP/WampServer) berjalan di localhost tanpa password.

### Langkah-Langkah:
1.  **Instalasi Dependensi**
    Pasang pustaka Python yang tertera di `requirements.txt`:
    ```bash
    pip install -r requirements.txt
    ```
2.  **Menjalankan Server**
    Jalankan perintah berikut untuk memulai server Flask:
    ```bash
    python app.py
    ```
3.  **Mengakses Aplikasi**
    Buka peramban (browser) dan akses alamat:
    [http://localhost:5000](http://localhost:5000)
