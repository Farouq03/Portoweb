// Store visitor name for welcome message
let visitorName = null;

// Only run welcomeMessage on the root homepage path "/"
if (window.location.pathname === "/") {
    const name = prompt("Please enter your name:");
    if (name && name !== "null" && name.trim() !== "") {
        visitorName = name.trim();
    }
}

// API Configuration
const API_URL = "/api/messages";

// Form elements (Might be null depending on page)
const formNama = document.getElementById("Nama");
const formEmail = document.getElementById("Email");
const formNoTelepon = document.getElementById("No_Telepon");
const formPesan = document.getElementById("Pesan");
const submitBtn = document.querySelector("#message-us-page button");

// State
let editingMessageId = null;

// Load data on load depending on the current page
document.addEventListener("DOMContentLoaded", () => {
    const path = window.location.pathname;

    // Highlight active nav link
    const navLinks = document.querySelectorAll(".nav-link");
    navLinks.forEach(link => {
        if (link.getAttribute("href") === path) {
            link.classList.add("active");
        } else {
            link.classList.remove("active");
        }
    });

    if (path === "/") {
        if (visitorName) {
            const titleEl = document.getElementById("welcome-message");
            if (titleEl) {
                titleEl.textContent = "Hi " + visitorName + ", welcome to my website";
            }
        }
    } else if (path === "/message") {
        fetchMessages();
    } else if (path === "/portfolio") {
        fetchProjects();
    } else if (path === "/profile") {
        fetchSkills();
        fetchProfileContent();
    }
});

// Fetch profile content (Read)
async function fetchProfileContent() {
    const descEl = document.getElementById("profile-description");
    if (!descEl) return;

    try {
        const response = await fetch("/api/profile-content");
        if (!response.ok) throw new Error("Gagal mengambil data profil");
        const data = await response.json();

        if (data.description) {
            descEl.textContent = data.description;
        }
    } catch (error) {
        console.error("Error fetching profile content:", error);
    }
}

// Fetch all messages (Read)
async function fetchMessages() {
    const listContainer = document.getElementById("messages-list") || document.getElementById("submitted-form");
    if (!listContainer) return;

    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error("Gagal mengambil data");
        const messages = await response.json();

        if (messages.length === 0) {
            listContainer.innerHTML = `<p class="text-gray-500 italic text-center py-4">Belum ada pesan. Jadilah yang pertama mengirim pesan!</p>`;
            return;
        }

        // Render messages
        listContainer.innerHTML = messages.map(msg => {
            // Escape HTML to prevent XSS
            const nameEscaped = escapeHTML(msg.nama);
            const emailEscaped = escapeHTML(msg.email);
            const phoneEscaped = escapeHTML(msg.no_telepon || "-");
            const messageEscaped = escapeHTML(msg.pesan);

            return `
                <div class="border border-zinc-200 p-4 bg-zinc-50/30 rounded-lg flex flex-col gap-2 relative">
                    <div class="flex justify-between items-start">
                        <div>
                            <h4 class="font-semibold text-zinc-900 text-sm">${nameEscaped}</h4>
                            <span class="text-[10px] text-zinc-400">${msg.created_at || ""}</span>
                        </div>
                        <div class="flex gap-2.5">
                            <button onclick="editMessage(${msg.id}, '${nameEscaped}', '${emailEscaped}', '${phoneEscaped}', '${messageEscaped}')" class="text-zinc-400 hover:text-zinc-900 text-xs font-medium cursor-pointer transition-colors">Edit</button>
                            <button onclick="deleteMessage(${msg.id})" class="text-zinc-400 hover:text-red-600 text-xs font-medium cursor-pointer transition-colors">Hapus</button>
                        </div>
                    </div>
                    <p class="text-zinc-700 text-sm mt-1 whitespace-pre-line leading-relaxed font-normal">${messageEscaped}</p>
                    <div class="text-[11px] text-zinc-500 flex flex-wrap gap-x-4 border-t border-zinc-100 pt-2 mt-1">
                        <div><strong class="font-normal text-zinc-400">Email:</strong> ${emailEscaped}</div>
                        <div><strong class="font-normal text-zinc-400">Telepon:</strong> ${phoneEscaped}</div>
                    </div>
                </div>
            `;
        }).join("");
    } catch (error) {
        console.error("Error fetching messages:", error);
        listContainer.innerHTML = `<p class="text-red-500 text-center py-4">Gagal memuat pesan. Pastikan server Flask Anda berjalan.</p>`;
    }
}

// Escape HTML characters
function escapeHTML(str) {
    if (!str) return "";
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Submit Form (Create or Update)
async function submitForm() {

    // Validate form inputs
    if (!formNama.value || !formEmail.value || !formNoTelepon.value || !formPesan.value) {
        alert("Harap isi semua kolom form sebelum mengirim.");
        return;
    }

    if (!/\S+@\S+\.\S+/.test(formEmail.value)) {
        alert("Masukkan alamat email yang valid.");
        return;
    }

    if (!/^\d{8,15}$/.test(formNoTelepon.value)) {
        alert("Masukkan nomor telepon yang valid (8-15 digit angka).");
        return;
    }

    const payload = {
        nama: formNama.value,
        email: formEmail.value,
        no_telepon: formNoTelepon.value,
        pesan: formPesan.value
    };

    try {
        let response;
        if (editingMessageId === null) {
            // Create
            response = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
        } else {
            // Update
            response = await fetch(`${API_URL}/${editingMessageId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
        }

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Gagal menyimpan pesan");

        alert(result.message || "Berhasil menyimpan pesan!");
        resetForm();
        fetchMessages();
    } catch (error) {
        console.error("Error saving message:", error);
        alert("Gagal mengirim pesan: " + error.message);
    }
}

// Edit Mode
function editMessage(id, nama, email, no_telepon, pesan) {
    editingMessageId = id;
    formNama.value = nama;
    formEmail.value = email;
    formNoTelepon.value = no_telepon;
    formPesan.value = pesan;

    // Change button text
    if (submitBtn) {
        submitBtn.textContent = "Perbarui Pesan";
        submitBtn.className = "w-full bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-3 rounded-lg transition-colors cursor-pointer text-sm shadow-xs";

        // Add cancel button if not already exists
        if (!document.getElementById("cancel-edit-btn")) {
            const cancelBtn = document.createElement("button");
            cancelBtn.id = "cancel-edit-btn";
            cancelBtn.type = "button";
            cancelBtn.textContent = "Batal Edit";
            cancelBtn.className = "w-full mt-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 font-medium py-2.5 rounded-lg transition-colors cursor-pointer text-sm border border-zinc-200";
            cancelBtn.onclick = resetForm;
            submitBtn.parentNode.appendChild(cancelBtn);
        }
    }

    // Scroll to form
    document.getElementById("message-us-page").scrollIntoView({ behavior: 'smooth' });
}

// Delete Message (Delete)
async function deleteMessage(id) {
    if (!confirm("Apakah Anda yakin ingin menghapus pesan ini?")) return;

    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: "DELETE"
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Gagal menghapus pesan");

        alert(result.message || "Pesan terhapus!");

        // If we are currently editing the deleted message, reset form
        if (editingMessageId === id) {
            resetForm();
        }

        fetchMessages();
    } catch (error) {
        console.error("Error deleting message:", error);
        alert("Gagal menghapus pesan: " + error.message);
    }
}

// Reset Form State
function resetForm() {
    editingMessageId = null;
    formNama.value = "";
    formEmail.value = "";
    formNoTelepon.value = "";
    formPesan.value = "";

    if (submitBtn) {
        submitBtn.textContent = "Submit";
        submitBtn.className = "w-full bg-zinc-900 hover:bg-zinc-800 text-white font-medium py-3 rounded-lg transition-colors cursor-pointer text-sm shadow-xs";
    }

    const cancelBtn = document.getElementById("cancel-edit-btn");
    if (cancelBtn) cancelBtn.remove();
}

// Fetch all portfolio projects (Read)
async function fetchProjects() {
    const container = document.getElementById("projects-container");
    if (!container) return;

    try {
        const response = await fetch("/api/projects");
        if (!response.ok) throw new Error("Gagal mengambil data proyek");
        const projects = await response.json();

        if (projects.length === 0) {
            container.innerHTML = `<p class="text-gray-500 italic py-4 col-span-3 text-center text-lg">Belum ada proyek ditambahkan.</p>`;
            return;
        }

        container.innerHTML = projects.map(proj => {
            const titleEscaped = escapeHTML(proj.title);
            const descEscaped = escapeHTML(proj.description);
            const gitUrl = proj.github_url ? escapeHTML(proj.github_url) : null;

            let cardContent = `
                <div class="border border-zinc-200 rounded-xl p-4 bg-white flex flex-col hover:border-zinc-400 transition-colors duration-200 text-left shadow-2xs">
                    <img src="${proj.image_url}" alt="${titleEscaped}" class="w-full h-48 object-cover rounded-lg mb-4 border border-zinc-100 bg-zinc-50"/>
                    <h3 class="text-base font-semibold text-zinc-900">${titleEscaped}</h3>
                    <p class="text-zinc-500 text-xs mt-2 flex-grow leading-relaxed font-normal">${descEscaped}</p>
            `;

            if (gitUrl) {
                cardContent += `
                    <a href="${gitUrl}" target="_blank" class="mt-4 inline-flex items-center gap-1 text-zinc-400 hover:text-zinc-900 text-xs font-semibold self-start cursor-pointer transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        GitHub
                    </a>
                `;
            }

            cardContent += `</div>`;
            return cardContent;
        }).join("");
    } catch (error) {
        console.error("Error fetching projects:", error);
        container.innerHTML = `<p class="text-red-500 text-center py-4 col-span-3 text-lg">Gagal memuat portofolio proyek.</p>`;
    }
}

// Fetch and render skills (Read)
async function fetchSkills() {
    const techContainer = document.getElementById("skills-technical");
    const softContainer = document.getElementById("skills-soft");
    if (!techContainer || !softContainer) return;

    try {
        const response = await fetch("/api/skills");
        if (!response.ok) throw new Error("Gagal mengambil data keahlian");
        const skills = await response.json();

        const techSkills = skills.filter(s => s.category === "Technical");
        const softSkills = skills.filter(s => s.category === "Soft");

        // Render Technical
        if (techSkills.length === 0) {
            techContainer.innerHTML = `<span class="text-xs text-gray-400 italic">Belum ada skill teknis.</span>`;
        } else {
            techContainer.innerHTML = techSkills.map(skill => `
                <span class="bg-zinc-100/70 text-zinc-800 px-3 py-1.5 rounded-full text-xs font-medium border border-zinc-200/50">${escapeHTML(skill.name)}</span>
            `).join("");
        }

        // Render Soft
        if (softSkills.length === 0) {
            softContainer.innerHTML = `<span class="text-xs text-zinc-400 italic">Belum ada soft skill.</span>`;
        } else {
            softContainer.innerHTML = softSkills.map(skill => `
                <span class="bg-zinc-100/70 text-zinc-800 px-3 py-1.5 rounded-full text-xs font-medium border border-zinc-200/50">${escapeHTML(skill.name)}</span>
            `).join("");
        }
    } catch (error) {
        console.error("Error fetching skills:", error);
        techContainer.innerHTML = `<span class="text-red-500 text-xs">Gagal memuat.</span>`;
        softContainer.innerHTML = `<span class="text-red-500 text-xs">Gagal memuat.</span>`;
    }
}