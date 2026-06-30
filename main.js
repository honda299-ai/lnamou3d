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
let currentAuthor = null; // "ريم" أو "مهند"
const STORAGE_KEY = "our_memories_author";

// ===== واجهة الترحيب =====
function showWelcomeOverlay() {
  document.getElementById("welcomeOverlay").classList.remove("hidden");
}

function hideWelcomeOverlay() {
  document.getElementById("welcomeOverlay").classList.add("hidden");
}

function chooseAuthor(author) {
  currentAuthor = author;
  localStorage.setItem(STORAGE_KEY, author);
  hideWelcomeOverlay();
  updateGreeting();
  // إعادة تحميل الذكريات (لتحديث العرض بدون إعادة تحميل الصفحة)
  renderMemories();
}

function updateGreeting() {
  const greetingEl = document.getElementById("greeting");
  if (currentAuthor === "ريم") {
    greetingEl.textContent = "👩 مرحباً ريم! اكتبي ذكرياتك الجميلة 💛";
  } else if (currentAuthor === "مهند") {
    greetingEl.textContent = "👨 مرحباً مهند! اكتبي ذكرياتك الجميلة 💛";
  } else {
    greetingEl.textContent = "كل ذكرى حلوة بينا ليها مكان هنا";
  }
}

// التحقق من وجود اختيار سابق
function loadAuthorPreference() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "ريم" || saved === "مهند") {
    currentAuthor = saved;
    hideWelcomeOverlay();
    updateGreeting();
    return true;
  }
  return false;
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
          author: data.author || "غير معروف",
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
  if (searchTerm) {
    filteredMemories = memories.filter(m =>
      m.title.toLowerCase().includes(searchTerm) ||
      m.text.toLowerCase().includes(searchTerm)
    );
  }

  document.getElementById("memoriesCount").textContent = memories.length;

  if (filteredMemories.length === 0) {
    if (memories.length === 0) {
      list.innerHTML = '<div class="empty">💛 مفيش ذكريات مكتوبة لسه... ابدأ بأول ذكرى جميلة 🥰</div>';
    } else {
      list.innerHTML = '<div class="empty">🔍 مفيش نتائج تطابق بحثك</div>';
    }
    return;
  }

  list.innerHTML = filteredMemories
    .map((memory) => {
      const author = memory.author || "غير معروف";
      const authorClass = author === "ريم" ? "author-reem" : "author-mohand";
      const authorBadge = author === "ريم" ? "reem" : "mohand";
      const authorEmoji = author === "ريم" ? "👩" : "👨";

      return `
      <div class="memory-card ${authorClass}">
        <div class="memory-top">
          <div class="memory-title">
            ${escapeHtml(memory.title)}
            <span class="author-badge ${authorBadge}">${authorEmoji} ${escapeHtml(author)}</span>
          </div>
          <div class="memory-date">📅 ${escapeHtml(memory.date || "بدون تاريخ")}</div>
        </div>
        <div class="memory-text">${nl2br(escapeHtml(memory.text))}</div>
      </div>
    `;
    })
    .join("");
}

// ===== حفظ ذكرى جديدة =====
async function saveMemory() {
  if (!currentAuthor) {
    alert("⚠️ من فضلك اختاري اسمك أولاً (ريم أو مهند)");
    showWelcomeOverlay();
    return;
  }

  const title = document.getElementById("title").value.trim();
  let date = document.getElementById("date").value;
  const text = document.getElementById("text").value.trim();

  if (!title || !text) {
    alert("⚠️ اكتبي عنوان الذكرى والتفاصيل الأول 💛");
    return;
  }

  if (!date) {
    date = new Date().toISOString().split('T')[0];
  }

  updateStatus("⏳ جاري الحفظ...");

  try {
    await db.collection(COLLECTION_NAME).add({
      title: title,
      date: date,
      text: text,
      author: currentAuthor,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    updateStatus("✅ تم حفظ الذكرى!");
    clearFields();
  } catch (error) {
    console.error("خطأ في الحفظ:", error);
    updateStatus("❌ حدث خطأ في الحفظ");
    alert("❌ حدث خطأ في حفظ الذكرى: " + error.message);
  }
}

// ===== مسح الحقول =====
function clearFields() {
  document.getElementById("title").value = "";
  document.getElementById("date").value = "";
  document.getElementById("text").value = "";
  updateStatus("");
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
document.addEventListener('DOMContentLoaded', function () {
  // 1. محاولة تحميل الاختيار السابق
  const hasPreference = loadAuthorPreference();

  // 2. إذا لم يكن هناك اختيار سابق، نظهر الـ overlay
  if (!hasPreference) {
    showWelcomeOverlay();
  }

  // 3. ربط زر الحفظ
  document.getElementById('saveBtn').addEventListener('click', saveMemory);

  // 4. بدء الاستماع للذكريات
  listenToMemories();

  console.log("🚀 بدء تشغيل تطبيق دفتر الذكريات (نسخة بدون تعديل/حذف)");
  console.log("📁 مشروع Firebase:", firebaseConfig.projectId);
});

// تعريف الدوال في النطاق العام للاستخدام من HTML
window.chooseAuthor = chooseAuthor;
window.clearFields = clearFields;
window.renderMemories = renderMemories;