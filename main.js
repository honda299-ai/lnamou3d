// ===== إعدادات Firebase =====
const firebaseConfig = {
  apiKey: "AIzaSyBqcB079jZPCgjt865b4ZSi4dEzrZHerwA",
  authDomain: "lanamu3d.firebaseapp.com",
  databaseURL: "https://lanamu3d-default-rtdb.firebaseio.com",
  projectId: "lanamu3d",
  storageBucket: "lanamu3d.firebasestorage.app",
  messagingSenderId: "815987598964",
  appId: "1:815987598964:web:fa6eadefcc4b6e49fc9321",
  measurementId: "G-NRPB74RGD0"
};

// ===== تهيئة Firebase =====
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ===== المتغيرات =====
const COLLECTION_NAME = "memories";
let memories = [];
let editingId = null;
let currentAuthor = "ريم";
let currentFilter = "all";

// ===== دوال اختيار الكاتب =====
function selectAuthor(author) {
  currentAuthor = author;
  document.getElementById("author").value = author;
  
  const reemBtn = document.getElementById("authorReem");
  const mohandBtn = document.getElementById("authorMohand");
  
  reemBtn.classList.remove("active-reem", "active-mohand");
  mohandBtn.classList.remove("active-reem", "active-mohand");
  
  if (author === "ريم") {
    reemBtn.classList.add("active-reem");
  } else {
    mohandBtn.classList.add("active-mohand");
  }
}

// ===== دوال الفلتر =====
function setFilter(filter) {
  currentFilter = filter;
  renderMemories();
  
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  if (filter === 'all') {
    document.getElementById('filterAll').classList.add('active');
  } else if (filter === 'reem') {
    document.getElementById('filterReem').classList.add('active');
  } else if (filter === 'mohand') {
    document.getElementById('filterMohand').classList.add('active');
  }
}

// ===== تنسيق الوقت =====
function formatTime(timestamp) {
  if (!timestamp) return "";
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return "";
  }
}

function formatTimeShort(timestamp) {
  if (!timestamp) return "";
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return "";
  }
}

// ===== جلب الذكريات =====
function listenToMemories() {
  db.collection(COLLECTION_NAME)
    .orderBy("createdAt", "desc")
    .onSnapshot((snapshot) => {
      memories = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        memories.push({
          id: doc.id,
          title: data.title || "",
          date: data.date || "",
          text: data.text || "",
          author: data.author || "ريم",
          edited: data.edited || false,
          createdAt: data.createdAt || null,
          updatedAt: data.updatedAt || null
        });
      });
      renderMemories();
      updateStatus(`✅ تم تحميل ${memories.length} ذكرى`);
    }, (error) => {
      console.error("❌ خطأ في الاستماع:", error);
      updateStatus("❌ حدث خطأ في تحميل الذكريات");
      document.getElementById("memoriesList").innerHTML = 
        '<div class="empty">❌ حدث خطأ في الاتصال بقاعدة البيانات.<br>تأكد من اتصال الإنترنت.</div>';
    });
}

// ===== عرض الذكريات =====
function renderMemories() {
  const list = document.getElementById("memoriesList");
  const searchTerm = document.getElementById("searchInput").value.toLowerCase().trim();

  let filteredMemories = memories;
  
  // فلتر حسب الكاتب
  if (currentFilter === 'reem') {
    filteredMemories = filteredMemories.filter(m => m.author === 'ريم');
  } else if (currentFilter === 'mohand') {
    filteredMemories = filteredMemories.filter(m => m.author === 'مهند');
  }
  
  // فلتر حسب البحث
  if (searchTerm) {
    filteredMemories = filteredMemories.filter(m => 
      m.title.toLowerCase().includes(searchTerm) || 
      m.text.toLowerCase().includes(searchTerm)
    );
  }

  document.getElementById("memoriesCount").textContent = memories.length;

  if (filteredMemories.length === 0) {
    if (memories.length === 0) {
      list.innerHTML = '<div class="empty">💛 مفيش ذكريات مكتوبة لسه...<br> ابدأ بأول ذكرى جميلة 🥰</div>';
    } else {
      list.innerHTML = '<div class="empty">🔍 مفيش نتائج تطابق بحثك</div>';
    }
    return;
  }

  list.innerHTML = filteredMemories
    .map((memory) => {
      const authorClass = memory.author === 'ريم' ? 'author-reem' : 'author-mohand';
      const authorBadge = memory.author === 'ريم' ? 'reem' : 'mohand';
      const authorEmoji = memory.author === 'ريم' ? '👩' : '👨';
      
      const createdTime = formatTime(memory.createdAt);
      const createdTimeShort = formatTimeShort(memory.createdAt);
      
      let editInfo = '';
      if (memory.edited && memory.updatedAt) {
        const updatedTime = formatTime(memory.updatedAt);
        editInfo = `<span class="memory-edit-info">تم التعديل ${updatedTime}</span>`;
      }
      
      return `
      <div class="memory-card ${authorClass} ${memory.edited ? 'edited' : ''}">
        <div class="memory-top">
          <div class="memory-title">
            ${escapeHtml(memory.title)}
            <span class="author-badge ${authorBadge}">${authorEmoji} ${escapeHtml(memory.author)}</span>
          </div>
          <div class="memory-meta">
            <span class="memory-date">📅 ${escapeHtml(memory.date || "بدون تاريخ")}</span>
            <span class="memory-time">🕐 ${createdTimeShort}</span>
            ${editInfo}
          </div>
        </div>
        <div class="memory-text">${nl2br(escapeHtml(memory.text))}</div>
        <div class="memory-actions">
          <button class="edit-btn" onclick="editMemory('${memory.id}')">✏️ تعديل</button>
        </div>
      </div>
    `;
    })
    .join("");
}

// ===== حفظ ذكرى =====
async function saveMemory() {
  const title = document.getElementById("title").value.trim();
  let date = document.getElementById("date").value;
  const text = document.getElementById("text").value.trim();
  const author = document.getElementById("author").value;

  if (!title || !text) {
    alert("⚠️ اكتبي عنوان الذكرى والتفاصيل الأول 💛");
    return;
  }

  if (!date) {
    date = new Date().toISOString().split('T')[0];
  }

  updateStatus("⏳ جاري الحفظ...");

  try {
    if (editingId) {
      // تحديث ذكرى موجودة
      await db.collection(COLLECTION_NAME).doc(editingId).update({
        title: title,
        date: date,
        text: text,
        author: author,
        edited: true,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      updateStatus("✅ تم تحديث الذكرى!");
    } else {
      // إضافة ذكرى جديدة
      await db.collection(COLLECTION_NAME).add({
        title: title,
        date: date,
        text: text,
        author: author,
        edited: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      updateStatus("✅ تم حفظ الذكرى!");
    }

    clearFields();
    editingId = null;
    
  } catch (error) {
    console.error("❌ خطأ في الحفظ:", error);
    updateStatus("❌ حدث خطأ في الحفظ");
    alert("❌ حدث خطأ في حفظ الذكرى: " + error.message);
  }
}

// ===== تعديل ذكرى =====
function editMemory(id) {
  const memory = memories.find(m => m.id === id);
  if (!memory) return;

  editingId = id;

  document.getElementById("title").value = memory.title || "";
  document.getElementById("date").value = memory.date || "";
  document.getElementById("text").value = memory.text || "";
  
  selectAuthor(memory.author || "ريم");

  document.querySelector(".form-section").scrollIntoView({ 
    behavior: 'smooth',
    block: 'center'
  });
  
  const saveBtn = document.getElementById('saveBtn');
  saveBtn.textContent = '🔄 تحديث الذكرى';
  saveBtn.style.background = '#4CAF50';
  
  setTimeout(() => {
    saveBtn.textContent = '💾 حفظ الذكرى';
    saveBtn.style.background = '#ff9800';
  }, 5000);
  
  updateStatus("✏️ جاري تعديل الذكرى...");
}

// ===== مسح الحقول =====
function clearFields() {
  document.getElementById("title").value = "";
  document.getElementById("date").value = "";
  document.getElementById("text").value = "";
  editingId = null;
  
  const saveBtn = document.getElementById('saveBtn');
  saveBtn.textContent = '💾 حفظ الذكرى';
  saveBtn.style.background = '#ff9800';
  
  updateStatus("");
  selectAuthor("ريم");
}

// ===== دوال مساعدة =====
function escapeHtml(text) {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function nl2br(text) {
  if (!text) return "";
  return text.replace(/\n/g, "<br>");
}

function updateStatus(message) {
  const statusEl = document.getElementById("loadingStatus");
  if (statusEl) {
    statusEl.textContent = message;
  }
}

// ===== ربط الأحداث =====
document.addEventListener('DOMContentLoaded', function() {
  // ربط زر الحفظ
  document.getElementById('saveBtn').addEventListener('click', saveMemory);
  
  // تعيين الكاتب الافتراضي
  selectAuthor("ريم");
  
  // تفعيل فلتر الكل افتراضياً
  setFilter('all');
  
  console.log("✅ تم تحميل التطبيق بنجاح!");
  console.log("📁 مشروع Firebase:", firebaseConfig.projectId);
});

// ===== بدء التطبيق =====
console.log("🚀 بدء تشغيل تطبيق دفتر الذكريات...");
listenToMemories();
updateStatus("🔄 جاري تحميل الذكريات...");