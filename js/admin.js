const API_BASE = "http://127.0.0.1:5000/api";
let adminPasscode = sessionStorage.getItem("admin_passcode") || "";
let editingProjectId = null;

// Initial check
document.addEventListener("DOMContentLoaded", () => {
    if (adminPasscode) {
        showDashboard();
    } else {
        showLogin();
    }
});

// Authentication UI control
function showLogin() {
    document.getElementById("login-container").classList.remove("hidden");
    document.getElementById("dashboard-container").classList.add("hidden");
}

function showDashboard() {
    document.getElementById("login-container").classList.add("hidden");
    document.getElementById("dashboard-container").classList.remove("hidden");
    
    // Load all data
    fetchAdminProfile();
    fetchAdminProjects();
    fetchAdminSkills();
    fetchAdminMessages();
}

async function handleLogin(e) {
    e.preventDefault();
    const passcodeVal = document.getElementById("passcode").value;
    
    try {
        const response = await fetch(`${API_BASE}/admin/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ passcode: passcodeVal })
        });
        
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Gagal masuk");
        
        adminPasscode = passcodeVal;
        sessionStorage.setItem("admin_passcode", adminPasscode);
        showDashboard();
        document.getElementById("passcode").value = "";
    } catch (err) {
        alert(err.message);
    }
}

function handleLogout() {
    sessionStorage.removeItem("admin_passcode");
    window.location.reload();
}

// Tab switcher
function switchTab(tabName) {
    const tabs = ["profile", "projects", "skills", "messages"];
    tabs.forEach(t => {
        const tabEl = document.getElementById(`tab-${t}`);
        const btnEl = document.getElementById(`tab-btn-${t}`);
        
        if (t === tabName) {
            tabEl.classList.remove("hidden");
            btnEl.className = `w-full text-left p-2.5 rounded-lg flex items-center gap-2.5 text-sm font-medium transition-all bg-zinc-900 text-white`;
            
            // Re-fetch data on active tab selection
            if (t === "profile") fetchAdminProfile();
            if (t === "projects") fetchAdminProjects();
            if (t === "skills") fetchAdminSkills();
            if (t === "messages") fetchAdminMessages();
        } else {
            tabEl.classList.add("hidden");
            btnEl.className = `w-full text-left p-2.5 rounded-lg flex items-center gap-2.5 text-sm font-medium transition-all text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900`;
        }
    });
}


// Profile Content CRUD
async function fetchAdminProfile() {
    try {
        const response = await fetch(`${API_BASE}/profile-content`);
        if (!response.ok) throw new Error("Gagal memuat konten profil");
        const data = await response.json();

        const descInput = document.getElementById("profile-desc");
        if (descInput) {
            descInput.value = data.description || "";
        }
    } catch (err) {
        console.error(err);
    }
}

async function handleProfileSubmit(e) {
    e.preventDefault();
    const descVal = document.getElementById("profile-desc").value;

    if (!descVal) {
        alert("Deskripsi profil wajib diisi.");
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/profile-content`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "X-Admin-Passcode": adminPasscode
            },
            body: JSON.stringify({ description: descVal })
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Gagal menyimpan");

        alert(result.message || "Konten profil berhasil diperbarui!");
    } catch (err) {
        alert(err.message);
    }
}



// Image Upload Handling
async function uploadImage(e) {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("image", file);

    const placeholder = document.getElementById("upload-placeholder");
    const previewContainer = document.getElementById("upload-preview-container");
    const previewImg = document.getElementById("upload-preview");
    const imgUrlInput = document.getElementById("project-image-url");

    try {
        placeholder.innerHTML = `<p class="text-xs font-medium text-zinc-500 animate-pulse">Mengunggah berkas gambar...</p>`;
        
        const response = await fetch(`${API_BASE}/upload`, {
            method: "POST",
            headers: {
                "X-Admin-Passcode": adminPasscode
            },
            body: formData
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Gagal mengunggah gambar");

        imgUrlInput.value = result.image_url;
        previewImg.src = result.image_url;
        
        placeholder.classList.add("hidden");
        previewContainer.classList.remove("hidden");
    } catch (err) {
        alert("Upload gagal: " + err.message);
        resetUploadPreview();
    }
}

function resetUploadPreview() {
    const placeholder = document.getElementById("upload-placeholder");
    const previewContainer = document.getElementById("upload-preview-container");
    const imgUrlInput = document.getElementById("project-image-url");
    const fileInput = document.getElementById("project-image-file");

    if (fileInput) fileInput.value = "";
    imgUrlInput.value = "";
    placeholder.classList.remove("hidden");
    placeholder.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" class="mx-auto h-8 w-8 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
        <p class="text-xs font-medium text-zinc-500">Klik untuk upload gambar</p>
        <p class="text-[10px] text-zinc-400">PNG, JPG, JPEG, atau WEBP</p>
    `;
    previewContainer.classList.add("hidden");
}

// Portfolio Projects CRUD
async function fetchAdminProjects() {
    const listContainer = document.getElementById("admin-projects-list");
    if (!listContainer) return;

    try {
        const response = await fetch(`${API_BASE}/projects`);
        if (!response.ok) throw new Error("Gagal memuat proyek");
        const projects = await response.json();

        if (projects.length === 0) {
            listContainer.innerHTML = `<p class="text-zinc-400 italic py-4 col-span-2 text-center text-sm">Belum ada proyek ditambahkan.</p>`;
            return;
        }

        listContainer.innerHTML = projects.map(proj => {
            const titleEscaped = escapeHTML(proj.title);
            const descEscaped = escapeHTML(proj.description);
            const gitEscaped = escapeHTML(proj.github_url || "");
            
            return `
                <div class="border border-zinc-200 rounded-lg p-3 bg-zinc-50/30 flex flex-col gap-2">
                    <img src="${proj.image_url}" alt="${titleEscaped}" class="w-full h-28 object-cover rounded-md mb-1 border border-zinc-100 bg-zinc-50">
                    <div>
                        <h4 class="font-semibold text-zinc-900 text-sm">${titleEscaped}</h4>
                        <p class="text-[11px] text-zinc-500 line-clamp-2 mt-1 leading-relaxed">${descEscaped}</p>
                    </div>
                    <div class="flex justify-between items-center mt-2 border-t border-zinc-100 pt-2 gap-2">
                        <span class="text-[10px] text-zinc-400 font-medium truncate max-w-[100px]" title="${gitEscaped}">${gitEscaped ? 'GitHub Terhubung' : 'No GitHub Link'}</span>
                        <div class="flex gap-1.5 shrink-0">
                            <button onclick="editAdminProject(${proj.id}, '${titleEscaped}', '${descEscaped.replace(/'/g, "\\'")}', '${proj.image_url}', '${gitEscaped}')" class="text-[10px] bg-zinc-100 hover:bg-zinc-200 text-zinc-600 px-2 py-1 rounded font-medium cursor-pointer transition-colors border border-zinc-200">Edit</button>
                            <button onclick="deleteAdminProject(${proj.id})" class="text-[10px] bg-zinc-100 hover:bg-red-100 text-zinc-600 hover:text-red-700 px-2 py-1 rounded font-medium cursor-pointer transition-colors border border-zinc-200">Hapus</button>
                        </div>
                    </div>
                </div>
            `;
        }).join("");
    } catch (err) {
        console.error(err);
        listContainer.innerHTML = `<p class="text-red-500 text-center py-4 col-span-2 text-sm">Gagal memuat daftar proyek.</p>`;
    }
}

async function handleProjectSubmit(e) {
    e.preventDefault();
    const titleVal = document.getElementById("project-title").value;
    const descVal = document.getElementById("project-desc").value;
    const imgUrlVal = document.getElementById("project-image-url").value;
    const githubVal = document.getElementById("project-github").value;

    if (!titleVal || !descVal || !imgUrlVal) {
        alert("Judul, Deskripsi, dan Gambar proyek wajib diisi.");
        return;
    }

    const payload = {
        title: titleVal,
        description: descVal,
        image_url: imgUrlVal,
        github_url: githubVal || null
    };

    try {
        let response;
        if (editingProjectId === null) {
            // Create
            response = await fetch(`${API_BASE}/projects`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Admin-Passcode": adminPasscode
                },
                body: JSON.stringify(payload)
            });
        } else {
            // Update
            response = await fetch(`${API_BASE}/projects/${editingProjectId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "X-Admin-Passcode": adminPasscode
                },
                body: JSON.stringify(payload)
            });
        }

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Gagal menyimpan proyek");

        alert(result.message || "Proyek berhasil disimpan!");
        resetProjectForm();
        fetchAdminProjects();
    } catch (err) {
        alert(err.message);
    }
}

function editAdminProject(id, title, description, image_url, github_url) {
    editingProjectId = id;
    
    // Set form fields
    document.getElementById("project-title").value = title;
    document.getElementById("project-desc").value = description;
    document.getElementById("project-image-url").value = image_url;
    document.getElementById("project-github").value = github_url === "null" ? "" : github_url;

    // Show image preview
    const placeholder = document.getElementById("upload-placeholder");
    const previewContainer = document.getElementById("upload-preview-container");
    const previewImg = document.getElementById("upload-preview");
    
    previewImg.src = image_url;
    placeholder.classList.add("hidden");
    previewContainer.classList.remove("hidden");

    // Change title and button text
    document.getElementById("project-form-title").textContent = "Edit Proyek #" + id;
    document.getElementById("project-submit-btn").textContent = "Perbarui Proyek";
    document.getElementById("project-submit-btn").className = "flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-2.5 rounded-lg transition-colors cursor-pointer text-sm shadow-xs";
    document.getElementById("project-cancel-btn").classList.remove("hidden");

    // Scroll to form
    document.getElementById("project-form").scrollIntoView({ behavior: 'smooth' });
}

async function deleteAdminProject(id) {
    if (!confirm("Apakah Anda yakin ingin menghapus proyek ini? Seluruh berkas gambar proyek yang terunggah juga akan terhapus.")) return;

    try {
        const response = await fetch(`${API_BASE}/projects/${id}`, {
            method: "DELETE",
            headers: {
                "X-Admin-Passcode": adminPasscode
            }
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Gagal menghapus proyek");

        alert(result.message || "Proyek berhasil dihapus!");
        if (editingProjectId === id) resetProjectForm();
        fetchAdminProjects();
    } catch (err) {
        alert(err.message);
    }
}

function resetProjectForm() {
    editingProjectId = null;
    document.getElementById("project-form").reset();
    resetUploadPreview();

    document.getElementById("project-form-title").textContent = "Tambah Proyek Baru";
    document.getElementById("project-submit-btn").textContent = "Simpan Proyek";
    document.getElementById("project-submit-btn").className = "flex-1 bg-zinc-900 hover:bg-zinc-800 text-white font-medium py-2.5 rounded-lg transition-colors cursor-pointer text-sm shadow-xs";
    document.getElementById("project-cancel-btn").classList.add("hidden");
}


// Skills CRUD
async function fetchAdminSkills() {
    const techContainer = document.getElementById("admin-skills-technical");
    const softContainer = document.getElementById("admin-skills-soft");
    if (!techContainer || !softContainer) return;

    try {
        const response = await fetch(`${API_BASE}/skills`);
        if (!response.ok) throw new Error("Gagal mengambil data keahlian");
        const skills = await response.json();

        // Filter categories
        const techSkills = skills.filter(s => s.category === "Technical");
        const softSkills = skills.filter(s => s.category === "Soft");

        // Render Technical Skills
        if (techSkills.length === 0) {
            techContainer.innerHTML = `<span class="text-xs text-zinc-400 italic">Belum ada technical skill ditambahkan.</span>`;
        } else {
            techContainer.innerHTML = techSkills.map(skill => `
                <div class="flex items-center gap-1.5 bg-zinc-100/70 text-zinc-700 px-3 py-1.5 rounded-full text-xs font-medium border border-zinc-200/50">
                    <span>${escapeHTML(skill.name)}</span>
                    <button onclick="deleteAdminSkill(${skill.id})" class="text-zinc-400 hover:text-red-600 font-bold ml-1 cursor-pointer transition-colors" title="Hapus keahlian">&times;</button>
                </div>
            `).join("");
        }

        // Render Soft Skills
        if (softSkills.length === 0) {
            softContainer.innerHTML = `<span class="text-xs text-zinc-400 italic">Belum ada soft skill ditambahkan.</span>`;
        } else {
            softContainer.innerHTML = softSkills.map(skill => `
                <div class="flex items-center gap-1.5 bg-zinc-100/70 text-zinc-700 px-3 py-1.5 rounded-full text-xs font-medium border border-zinc-200/50">
                    <span>${escapeHTML(skill.name)}</span>
                    <button onclick="deleteAdminSkill(${skill.id})" class="text-zinc-400 hover:text-red-600 font-bold ml-1 cursor-pointer transition-colors" title="Hapus keahlian">&times;</button>
                </div>
            `).join("");
        }
    } catch (err) {
        console.error(err);
        techContainer.innerHTML = `<p class="text-red-500 text-xs">Gagal memuat data skill.</p>`;
    }
}

async function handleSkillSubmit(e) {
    e.preventDefault();
    const catVal = document.getElementById("skill-category").value;
    const nameVal = document.getElementById("skill-name").value;

    if (!catVal || !nameVal) return;

    try {
        const response = await fetch(`${API_BASE}/skills`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Admin-Passcode": adminPasscode
            },
            body: JSON.stringify({ category: catVal, name: nameVal })
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Gagal menyimpan skill");

        document.getElementById("skill-name").value = "";
        fetchAdminSkills();
    } catch (err) {
        alert(err.message);
    }
}

async function deleteAdminSkill(id) {
    if (!confirm("Apakah Anda yakin ingin menghapus keahlian ini?")) return;

    try {
        const response = await fetch(`${API_BASE}/skills/${id}`, {
            method: "DELETE",
            headers: {
                "X-Admin-Passcode": adminPasscode
            }
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Gagal menghapus skill");

        fetchAdminSkills();
    } catch (err) {
        alert(err.message);
    }
}


// Guestbook Messages
async function fetchAdminMessages() {
    const listContainer = document.getElementById("admin-messages-list");
    if (!listContainer) return;

    try {
        const response = await fetch(`${API_BASE}/messages`);
        if (!response.ok) throw new Error("Gagal mengambil pesan");
        const messages = await response.json();

        if (messages.length === 0) {
            listContainer.innerHTML = `<p class="text-zinc-400 italic py-4 text-center text-sm">Belum ada pesan terkirim.</p>`;
            return;
        }

        listContainer.innerHTML = messages.map(msg => {
            const nameEscaped = escapeHTML(msg.nama);
            const emailEscaped = escapeHTML(msg.email);
            const phoneEscaped = escapeHTML(msg.no_telepon || "-");
            const messageEscaped = escapeHTML(msg.pesan);

            return `
                <div class="border border-zinc-200 rounded-lg p-4 bg-zinc-50/30 flex flex-col gap-2 relative">
                    <div class="flex justify-between items-start">
                        <div>
                            <h4 class="font-semibold text-zinc-900 text-sm">${nameEscaped}</h4>
                            <span class="text-[10px] text-zinc-400">${msg.created_at || ""}</span>
                        </div>
                        <button onclick="deleteAdminMessage(${msg.id})" class="text-[10px] bg-zinc-100 hover:bg-red-100 text-zinc-600 hover:text-red-700 px-2 py-1 rounded font-medium cursor-pointer transition-colors border border-zinc-200">Hapus</button>
                    </div>
                    <p class="text-zinc-700 text-sm whitespace-pre-line leading-relaxed font-normal">${messageEscaped}</p>
                    <div class="text-[11px] text-zinc-500 flex flex-wrap gap-x-4 border-t border-zinc-100 pt-2 mt-1">
                        <div><strong class="font-normal text-zinc-400">Email:</strong> ${emailEscaped}</div>
                        <div><strong class="font-normal text-zinc-400">Telepon:</strong> ${phoneEscaped}</div>
                    </div>
                </div>
            `;
        }).join("");
    } catch (err) {
        console.error(err);
        listContainer.innerHTML = `<p class="text-red-500 text-center py-4 text-sm">Gagal memuat daftar pesan.</p>`;
    }
}

async function deleteAdminMessage(id) {
    if (!confirm("Apakah Anda yakin ingin menghapus pesan ini dari database?")) return;

    try {
        const response = await fetch(`${API_BASE}/messages/${id}`, {
            method: "DELETE"
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Gagal menghapus pesan");

        fetchAdminMessages();
    } catch (err) {
        alert(err.message);
    }
}


// Helper: Escape HTML
function escapeHTML(str) {
    if (!str) return "";
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
