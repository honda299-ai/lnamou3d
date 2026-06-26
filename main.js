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
let currentFilter = "all"; // all, reem, mohand

// ===== دوال اختيار الكاتب =====
function selectAuthor(author) {
  currentAuthor = author;
  document.getElementById("author").value = author;
  
  const reemBtn = document.getElementById("authorReem");
  const mohandBtn = document.getElementById("authorMohand");
  
  // إزالة الكلاسات السابقة
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
  
  // تحديث أزرار الفلتر
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
          createdAt: data.createdAt || null
        });
      });
      renderMemories();
      updateStatus(`✅ تم تحميل ${memories.length} ذكرى`);
    }, (error) => {
      console.error("خطأ في الاستماع:", error);
      updateStatus("❌ حدث خطأ في تحميل الذكريات");
      document.getElementById("memoriesList").innerHTML = 
        '<div class="empty">❌ حدث خطأ في الاتصال بقاعدة البيانات.<br>تأكد من إعدادات Firebase وقواعد الأمان.</div>';
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
    list.innerHTML = '<div class="empty">مفيش ذكريات مكتوبة لسه... ابدأ بأول ذكرى جميلة 💛</div>';
    return;
  }

  list.innerHTML = filteredMemories
    .map((memory) => {
      const isEdited = memory.edited || false;
      const editedClass = isEdited ? 'edited' : '';
      const editedBadge = isEdited ? '<span class="edit-badge">تم التعديل</span>' : '';
      
      // تحديد الكلاسات حسب الكاتب
      const authorClass = memory.author === 'ريم' ? 'author-reem' : 'author-mohand';
      const authorBadge = memory.author === 'ريم' ? 'reem' : 'mohand';
      const authorEmoji = memory.author === 'ريم' ? '👩' : '👨';
      
      return `
      <div class="memory-card ${authorClass} ${editedClass}">
        <div class="memory-top">
          <div class="memory-title">
            ${escapeHtml(memory.title)}
            <span class="author-badge ${authorBadge}">${authorEmoji} ${escapeHtml(memory.author)}</span>
            ${editedBadge}
          </div>
          <div class="memory-date">${escapeHtml(memory.date || "بدون تاريخ")}</div>
        </div>
        <div class="memory-text">${nl2br(escapeHtml(memory.text))}</div>
        <div class="memory-actions">
          <button class="edit-btn" onclick="editMemory('${memory.id}')">تعديل</button>
          <button class="delete-btn" onclick="deleteMemory('${memory.id}')">حذف</button>
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
    alert("اكتبي عنوان الذكرى والتفاصيل الأول 💛");
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
    console.error("خطأ في الحفظ:", error);
    updateStatus("❌ حدث خطأ في الحفظ");
    alert("حدث خطأ في حفظ الذكرى: " + error.message);
  }
}

// ===== حذف ذكرى =====
async function deleteMemory(id) {
  if (!confirm("متأكد إنك عايزة تحذفي الذكرى دي؟")) return;

  updateStatus("⏳ جاري الحذف...");

  try {
    await db.collection(COLLECTION_NAME).doc(id).delete();
    updateStatus("✅ تم حذف الذكرى");
    if (editingId === id) {
      clearFields();
      editingId = null;
    }
  } catch (error) {
    console.error("خطأ في الحذف:", error);
    updateStatus("❌ حدث خطأ في الحذف");
    alert("حدث خطأ في حذف الذكرى: " + error.message);
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
  
  // تحديد الكاتب
  selectAuthor(memory.author || "ريم");

  document.querySelector(".form-section").scrollIntoView({ behavior: 'smooth' });
  
  const saveBtn = document.getElementById('saveBtn');
  saveBtn.textContent = 'تحديث الذكرى ✏️';
  setTimeout(() => {
    saveBtn.textContent = 'حفظ الذكرى';
  }, 3000);
  
  updateStatus("✏️ جاري تعديل الذكرى...");
}

// ===== مسح الحقول =====
function clearFields() {
  document.getElementById("title").value = "";
  document.getElementById("date").value = "";
  document.getElementById("text").value = "";
  editingId = null;
  const saveBtn = document.getElementById('saveBtn');
  saveBtn.textContent = 'حفظ الذكرى';
  updateStatus("");
  // إعادة تعيين الكاتب إلى ريم كافتراضي
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

// ===== إضافة أزرار الفلتر في قسم الذكريات =====
function addFilterButtons() {
  const memoriesSection = document.querySelector('.memories-section');
  const searchInput = document.getElementById('searchInput');
  
  const filterDiv = document.createElement('div');
  filterDiv.className = 'filter-section';
  filterDiv.innerHTML = `
    <button class="filter-btn active" id="filterAll" onclick="setFilter('all')">📋 الكل</button>
    <button class="filter-btn filter-reem" id="filterReem" onclick="setFilter('reem')">👩 ريم</button>
    <button class="filter-btn filter-mohand" id="filterMohand" onclick="setFilter('mohand')">👨 مهند</button>
  `;
  
  memoriesSection.insertBefore(filterDiv, searchInput);
}

// ===== ربط الأحداث =====
document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('saveBtn').addEventListener('click', saveMemory);
  
  // تعيين الكاتب الافتراضي
  selectAuthor("ريم");
  
  // إضافة أزرار الفلتر
  addFilterButtons();
});

// ===== بدء التطبيق =====
console.log("🚀 بدء تشغيل تطبيق دفتر الذكريات");
console.log("📁 مشروع Firebase:", firebaseConfig.projectId);

// بدء الاستماع للذكريات
listenToMemories();

// عرض رسالة ترحيب
updateStatus("🔄 جاري تحميل الذكريات...");