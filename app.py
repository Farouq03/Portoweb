import os
# pyrefly: ignore [missing-import]
from flask import Flask, request, jsonify, render_template
# pyrefly: ignore [missing-import]
from flask_cors import CORS
# pyrefly: ignore [missing-import]
import mysql.connector
# pyrefly: ignore [missing-import]
from mysql.connector import Error
from werkzeug.utils import secure_filename

app = Flask(__name__, static_folder='.', static_url_path='')
# Enable CORS for local testing/development
CORS(app)

# Image upload configuration
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'}

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# Simple passcode for admin validation
ADMIN_PASSCODE = os.getenv('ADMIN_PASSCODE')

# Database configuration (supports local XAMPP and Docker containers)
DB_CONFIG = {
    'host': os.getenv('DB_HOST'),
    'port': int(os.getenv('DB_PORT')),
    'user': os.getenv('DB_USER'),
    'password': os.getenv('DB_PASSWORD'),
    'database': os.getenv('DB_NAME')
}

def get_db_connection():
    """Establish connection to MySQL database."""
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        return connection
    except Error as e:
        print(f"Error connecting to MySQL: {e}")
        return None

def init_db():
    """Initialize database and schema tables if they do not exist."""
    try:
        conn_config = DB_CONFIG.copy()
        db_name = conn_config.pop('database')
        
        connection = mysql.connector.connect(**conn_config)
        cursor = connection.cursor()
        
        # Create database if not exists
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {db_name}")
        cursor.execute(f"USE {db_name}")
        
        # Create messages table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS messages (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nama VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL,
            no_telepon VARCHAR(50),
            pesan TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """)
        
        # Create projects table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS projects (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            description TEXT NOT NULL,
            image_url VARCHAR(255) NOT NULL,
            github_url VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """)

        # Create skills table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS skills (
            id INT AUTO_INCREMENT PRIMARY KEY,
            category VARCHAR(50) NOT NULL, -- 'Technical' or 'Soft'
            name VARCHAR(100) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """)

        # Create profile_content table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS profile_content (
            id INT AUTO_INCREMENT PRIMARY KEY,
            description TEXT NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
        """)

        # Seed default profile description if empty
        cursor.execute("SELECT COUNT(*) FROM profile_content")
        count = cursor.fetchone()[0]
        if count == 0:
            cursor.execute(
                "INSERT INTO profile_content (description) VALUES (%s)",
                (
                    "Hi! I'm Farouq, a Fresh graduate in Electrical Engineering with a strong interest in IoT systems, programming, and creative technology applications. Experienced in collaborative research and student organization projects, including the development of a smart farming system using IoT and an AI-based object detection model. Passionate about technology innovation and motivated to learn new skills.",
                )
            )
        
        connection.commit()
        cursor.close()
        connection.close()
        print("Database initialized successfully.")
    except Error as e:
        print(f"Database initialization failed: {e}")


# Initialize database on startup
init_db()

# Check allowed file extensions for uploads
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Validate admin authorization passcode
def verify_admin_auth():
    passcode = request.headers.get('X-Admin-Passcode')
    if passcode != ADMIN_PASSCODE:
        return False
    return True


# Routing Page (Jinja2 Template)

@app.route('/')
def home():
    """Render home page."""
    return render_template('home.html')

@app.route('/profile')
def profile():
    """Render profile page."""
    return render_template('profile.html')

@app.route('/portfolio')
def portfolio():
    """Render portfolio page."""
    return render_template('portfolio.html')

@app.route('/message')
def message_us():
    """Render guest book page."""
    return render_template('message.html')

@app.route('/admin')
def admin_panel():
    """Render admin panel."""
    return render_template('admin.html')


# Endpoint: Admin Autentikasi

@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    data = request.json
    if not data or 'passcode' not in data:
        return jsonify({"error": "Passcode wajib dikirim"}), 400
    
    if data['passcode'] == ADMIN_PASSCODE:
        return jsonify({"message": "Login berhasil", "authenticated": True}), 200
    else:
        return jsonify({"error": "Passcode admin salah!"}), 401


# Endpoint: Profile Content (Read & Update)

@app.route('/api/profile-content', methods=['GET'])
def get_profile_content():
    """Get profile description."""
    connection = get_db_connection()
    if not connection:
        return jsonify({"error": "Gagal terhubung ke database"}), 500
    try:
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT id, description FROM profile_content LIMIT 1")
        content = cursor.fetchone()
        cursor.close()
        connection.close()
        if not content:
            return jsonify({
                "description": "Hi! I'm Farouq, a Fresh graduate in Electrical Engineering with a strong interest in IoT systems, programming, and creative technology applications. Experienced in collaborative research and student organization projects, including the development of a smart farming system using IoT and an AI-based object detection model. Passionate about technology innovation and motivated to learn new skills."
            }), 200
        return jsonify(content), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/profile-content', methods=['PUT'])
def update_profile_content():
    """Update profile description (admin only)."""
    if not verify_admin_auth():
        return jsonify({"error": "Unauthorized"}), 401

    data = request.json
    if not data:
        return jsonify({"error": "Tidak ada data yang dikirim"}), 400

    description = data.get('description')

    if not description:
        return jsonify({"error": "Deskripsi profil wajib diisi"}), 400

    connection = get_db_connection()
    if not connection:
        return jsonify({"error": "Gagal terhubung ke database"}), 500
    try:
        cursor = connection.cursor()
        cursor.execute("SELECT id FROM profile_content LIMIT 1")
        row = cursor.fetchone()
        if row:
            cursor.execute(
                "UPDATE profile_content SET description = %s WHERE id = %s",
                (description, row[0])
            )
        else:
            cursor.execute(
                "INSERT INTO profile_content (description) VALUES (%s)",
                (description,)
            )
        connection.commit()
        cursor.close()
        connection.close()
        return jsonify({"message": "Konten profil berhasil diperbarui!"}), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500


# Endpoint: Image Uploader
@app.route('/api/upload', methods=['POST'])
def upload_image():
    if not verify_admin_auth():
        return jsonify({"error": "Unauthorized"}), 401
        
    if 'image' not in request.files:
        return jsonify({"error": "Tidak ada bagian file 'image' dalam form upload"}), 400
        
    file = request.files['image']
    if file.filename == '':
        return jsonify({"error": "Tidak ada berkas yang dipilih"}), 400
        
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        # Append timestamp to make filename unique
        import time
        unique_filename = f"{int(time.time())}_{filename}"
        file_path = os.path.join(UPLOAD_FOLDER, unique_filename)
        file.save(file_path)
        
        # Relative URL path to file
        relative_url = f"/uploads/{unique_filename}"
        return jsonify({
            "message": "Berkas berhasil diunggah",
            "image_url": relative_url
        }), 200
        
    return jsonify({"error": "Ekstensi file tidak diizinkan"}), 400


# Endpoint: Guestbook Messages (CRUD)
@app.route('/api/messages', methods=['GET'])
def get_messages():
    connection = get_db_connection()
    if not connection:
        return jsonify({"error": "Gagal terhubung ke database"}), 500
    try:
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT id, nama, email, no_telepon, pesan, created_at FROM messages ORDER BY id DESC")
        messages = cursor.fetchall()
        for msg in messages:
            if msg['created_at']:
                msg['created_at'] = msg['created_at'].strftime('%Y-%m-%d %H:%M:%S')
        cursor.close()
        connection.close()
        return jsonify(messages), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/messages', methods=['POST'])
def create_message():
    data = request.json
    if not data:
        return jsonify({"error": "Tidak ada data yang dikirim"}), 400
    nama = data.get('nama')
    email = data.get('email')
    no_telepon = data.get('no_telepon')
    pesan = data.get('pesan')
    
    if not nama or not email or not pesan:
        return jsonify({"error": "Nama, Email, dan Pesan wajib diisi"}), 400
        
    connection = get_db_connection()
    if not connection:
        return jsonify({"error": "Gagal terhubung ke database"}), 500
    try:
        cursor = connection.cursor()
        insert_query = "INSERT INTO messages (nama, email, no_telepon, pesan) VALUES (%s, %s, %s, %s)"
        cursor.execute(insert_query, (nama, email, no_telepon, pesan))
        connection.commit()
        new_id = cursor.lastrowid
        cursor.close()
        connection.close()
        return jsonify({"message": "Pesan berhasil disimpan!", "id": new_id}), 201
    except Error as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/messages/<int:msg_id>', methods=['PUT'])
def update_message(msg_id):
    data = request.json
    if not data:
        return jsonify({"error": "Tidak ada data yang dikirim"}), 400
    nama = data.get('nama')
    email = data.get('email')
    no_telepon = data.get('no_telepon')
    pesan = data.get('pesan')
    
    if not nama or not email or not pesan:
        return jsonify({"error": "Nama, Email, dan Pesan wajib diisi"}), 400
        
    connection = get_db_connection()
    if not connection:
        return jsonify({"error": "Gagal terhubung ke database"}), 500
    try:
        cursor = connection.cursor()
        cursor.execute("SELECT id FROM messages WHERE id = %s", (msg_id,))
        if not cursor.fetchone():
            cursor.close()
            connection.close()
            return jsonify({"error": "Pesan tidak ditemukan"}), 404
            
        update_query = "UPDATE messages SET nama = %s, email = %s, no_telepon = %s, pesan = %s WHERE id = %s"
        cursor.execute(update_query, (nama, email, no_telepon, pesan, msg_id))
        connection.commit()
        cursor.close()
        connection.close()
        return jsonify({"message": "Pesan berhasil diperbarui!"}), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/messages/<int:msg_id>', methods=['DELETE'])
def delete_message(msg_id):
    connection = get_db_connection()
    if not connection:
        return jsonify({"error": "Gagal terhubung ke database"}), 500
    try:
        cursor = connection.cursor()
        cursor.execute("SELECT id FROM messages WHERE id = %s", (msg_id,))
        if not cursor.fetchone():
            cursor.close()
            connection.close()
            return jsonify({"error": "Pesan tidak ditemukan"}), 404
            
        cursor.execute("DELETE FROM messages WHERE id = %s", (msg_id,))
        connection.commit()
        cursor.close()
        connection.close()
        return jsonify({"message": "Pesan berhasil dihapus!"}), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500


# Endpoint: Portfolio Projects (CRUD)

@app.route('/api/projects', methods=['GET'])
def get_projects():
    connection = get_db_connection()
    if not connection:
        return jsonify({"error": "Gagal terhubung ke database"}), 500
    try:
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT id, title, description, image_url, github_url, created_at FROM projects ORDER BY id DESC")
        projects = cursor.fetchall()
        for proj in projects:
            if proj['created_at']:
                proj['created_at'] = proj['created_at'].strftime('%Y-%m-%d %H:%M:%S')
        cursor.close()
        connection.close()
        return jsonify(projects), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/projects', methods=['POST'])
def create_project():
    if not verify_admin_auth():
        return jsonify({"error": "Unauthorized"}), 401
        
    data = request.json
    if not data:
        return jsonify({"error": "Tidak ada data yang dikirim"}), 400
        
    title = data.get('title')
    description = data.get('description')
    image_url = data.get('image_url')
    github_url = data.get('github_url')
    
    if not title or not description or not image_url:
        return jsonify({"error": "Judul, Deskripsi, dan Gambar proyek wajib diisi"}), 400
        
    connection = get_db_connection()
    if not connection:
        return jsonify({"error": "Gagal terhubung ke database"}), 500
    try:
        cursor = connection.cursor()
        insert_query = """
        INSERT INTO projects (title, description, image_url, github_url) 
        VALUES (%s, %s, %s, %s)
        """
        cursor.execute(insert_query, (title, description, image_url, github_url))
        connection.commit()
        new_id = cursor.lastrowid
        cursor.close()
        connection.close()
        return jsonify({"message": "Proyek berhasil ditambahkan!", "id": new_id}), 201
    except Error as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/projects/<int:proj_id>', methods=['PUT'])
def update_project(proj_id):
    if not verify_admin_auth():
        return jsonify({"error": "Unauthorized"}), 401
        
    data = request.json
    if not data:
        return jsonify({"error": "Tidak ada data yang dikirim"}), 400
        
    title = data.get('title')
    description = data.get('description')
    image_url = data.get('image_url')
    github_url = data.get('github_url')
    
    if not title or not description or not image_url:
        return jsonify({"error": "Judul, Deskripsi, dan Gambar proyek wajib diisi"}), 400
        
    connection = get_db_connection()
    if not connection:
        return jsonify({"error": "Gagal terhubung ke database"}), 500
    try:
        cursor = connection.cursor()
        cursor.execute("SELECT id, image_url FROM projects WHERE id = %s", (proj_id,))
        project = cursor.fetchone()
        if not project:
            cursor.close()
            connection.close()
            return jsonify({"error": "Proyek tidak ditemukan"}), 404
            
        old_image_url = project[1]
        
        update_query = """
        UPDATE projects 
        SET title = %s, description = %s, image_url = %s, github_url = %s 
        WHERE id = %s
        """
        cursor.execute(update_query, (title, description, image_url, github_url, proj_id))
        connection.commit()
        cursor.close()
        connection.close()
        
        # Delete old image if updated
        if old_image_url != image_url and old_image_url.startswith('/uploads/'):
            try:
                old_file_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), old_image_url.lstrip('/'))
                if os.path.exists(old_file_path):
                    os.remove(old_file_path)
            except Exception as ex:
                print(f"Gagal menghapus berkas gambar lama: {ex}")
                
        return jsonify({"message": "Proyek berhasil diperbarui!"}), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/projects/<int:proj_id>', methods=['DELETE'])
def delete_project(proj_id):
    if not verify_admin_auth():
        return jsonify({"error": "Unauthorized"}), 401
        
    connection = get_db_connection()
    if not connection:
        return jsonify({"error": "Gagal terhubung ke database"}), 500
    try:
        cursor = connection.cursor()
        cursor.execute("SELECT id, image_url FROM projects WHERE id = %s", (proj_id,))
        project = cursor.fetchone()
        if not project:
            cursor.close()
            connection.close()
            return jsonify({"error": "Proyek tidak ditemukan"}), 404
            
        image_url = project[1]
        
        cursor.execute("DELETE FROM projects WHERE id = %s", (proj_id,))
        connection.commit()
        cursor.close()
        connection.close()
        
        # Delete local image file
        if image_url.startswith('/uploads/'):
            try:
                file_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), image_url.lstrip('/'))
                if os.path.exists(file_path):
                    os.remove(file_path)
            except Exception as ex:
                print(f"Gagal menghapus berkas gambar: {ex}")
                
        return jsonify({"message": "Proyek berhasil dihapus!"}), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500


# Endpoint: Skill & Resume (CRUD)

@app.route('/api/skills', methods=['GET'])
def get_skills():
    connection = get_db_connection()
    if not connection:
        return jsonify({"error": "Gagal terhubung ke database"}), 500
    try:
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT id, category, name FROM skills ORDER BY category, id DESC")
        skills = cursor.fetchall()
        cursor.close()
        connection.close()
        return jsonify(skills), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/skills', methods=['POST'])
def create_skill():
    if not verify_admin_auth():
        return jsonify({"error": "Unauthorized"}), 401
        
    data = request.json
    if not data:
        return jsonify({"error": "Tidak ada data yang dikirim"}), 400
        
    category = data.get('category')
    name = data.get('name')
    
    if not category or not name or category not in ['Technical', 'Soft']:
        return jsonify({"error": "Nama skill dan Kategori ('Technical' atau 'Soft') wajib diisi"}), 400
        
    connection = get_db_connection()
    if not connection:
        return jsonify({"error": "Gagal terhubung ke database"}), 500
    try:
        cursor = connection.cursor()
        insert_query = "INSERT INTO skills (category, name) VALUES (%s, %s)"
        cursor.execute(insert_query, (category, name))
        connection.commit()
        new_id = cursor.lastrowid
        cursor.close()
        connection.close()
        return jsonify({"message": "Skill berhasil ditambahkan!", "id": new_id}), 201
    except Error as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/skills/<int:skill_id>', methods=['DELETE'])
def delete_skill(skill_id):
    if not verify_admin_auth():
        return jsonify({"error": "Unauthorized"}), 401
        
    connection = get_db_connection()
    if not connection:
        return jsonify({"error": "Gagal terhubung ke database"}), 500
    try:
        cursor = connection.cursor()
        cursor.execute("SELECT id FROM skills WHERE id = %s", (skill_id,))
        if not cursor.fetchone():
            cursor.close()
            connection.close()
            return jsonify({"error": "Skill tidak ditemukan"}), 404
            
        cursor.execute("DELETE FROM skills WHERE id = %s", (skill_id,))
        connection.commit()
        cursor.close()
        connection.close()
        return jsonify({"message": "Skill berhasil dihapus!"}), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(
        host=os.getenv('HOST', '0.0.0.0'),
        port=5000,
        debug=os.getenv('FLASK_DEBUG', 'false').lower() == 'true'
    )
