<template>
  <aside class="sidebar">
    <div class="logo">
      <div class="logo-mark">KN</div>
      <div class="logo-text">Keep<span>Note</span></div>
    </div>

    <!-- 搜索 -->
    <div class="search-wrap">
      <el-input
          v-model="searchKeyword"
          placeholder="搜索笔记…"
          :prefix-icon="Search"
          clearable
          @input="emit('search', searchKeyword)"
      />
    </div>

    <!-- 导航 -->
    <div class="nav-section">
      <div class="nav-label">导航</div>
      <div
          v-for="item in navItems" :key="item.key"
          class="nav-item"
          :class="{ active: activeNav === item.key }"
          @click="emit('nav-change', item.key)"
      >
        <el-icon><component :is="item.icon" /></el-icon>
        {{ item.label }}
        <span class="badge">{{ item.count }}</span>
      </div>
    </div>

    <div class="sidebar-divider" />

    <!-- 分类 -->
    <div class="nav-section">
      <div class="nav-label">分类</div>
    </div>
    <div class="category-list">
      <div
          v-for="cat in categories" :key="cat.id"
          class="category-item"
          :class="{ active: activeCategoryId === cat.id }"
          @click="emit('category-change', cat.id)"
      >
        <span class="category-dot" :style="{ background: cat.color || '#aaa' }" />
        {{ cat.name }}
        <span class="count">{{ cat.noteCount ?? 0 }}</span>
      </div>
      <div class="category-item add-btn" @click="showAddCategory = true">
        <el-icon><Plus /></el-icon> 新增分类
      </div>
    </div>

    <!-- 用户区 -->
    <div class="user-area" @click="openProfile">
      <div class="avatar">
        <img v-if="userStore.userInfo?.avatar" :src="userStore.userInfo.avatar" class="avatar-img" />
        <span v-else>{{ avatarChar }}</span>
      </div>
      <div class="user-info">
        <div class="user-name">{{ displayName }}</div>
        <div class="user-role">{{ userStore.userInfo?.email || '点击编辑资料' }}</div>
      </div>
      <el-icon style="color:var(--text-dim)"><Setting /></el-icon>
    </div>

    <!-- 新增分类弹窗 -->
    <el-dialog v-model="showAddCategory" title="新增分类" width="320px">
      <el-form :model="categoryForm">
        <el-form-item label="名称">
          <el-input v-model="categoryForm.name" placeholder="分类名称" />
        </el-form-item>
        <el-form-item label="颜色">
          <div class="color-options">
            <span
                v-for="c in colorOptions" :key="c"
                class="color-dot"
                :style="{ background: c, outline: categoryForm.color === c ? `2px solid ${c}` : 'none' }"
                @click="categoryForm.color = c"
            />
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddCategory = false">取消</el-button>
        <el-button type="primary" @click="submitCategory">确定</el-button>
      </template>
    </el-dialog>

    <!-- 个人资料弹窗 -->
    <el-dialog v-model="showProfile" title="个人资料" width="380px" @open="initProfileForm">
      <el-form :model="profileForm" label-width="70px">
        <!-- 头像 -->
        <el-form-item label="头像">
          <div class="avatar-upload">
            <div class="avatar-preview" @click="triggerFileInput" title="点击上传图片">
              <img v-if="profileForm.avatar" :src="profileForm.avatar" class="avatar-img" />
              <span v-else class="avatar-placeholder">{{ avatarChar }}</span>
              <div class="avatar-overlay"><el-icon><Camera /></el-icon></div>
            </div>
            <div class="avatar-actions">
              <el-button size="small" @click="triggerFileInput">上传图片</el-button>
              <input ref="fileInputRef" type="file" accept="image/*" style="display:none" @change="onFileChange" />
              <div class="avatar-divider">或</div>
              <el-input v-model="profileForm.avatar" placeholder="输入图片 URL" size="small" style="width:180px" />
            </div>
          </div>
        </el-form-item>
        <el-form-item label="昵称">
          <el-input v-model="profileForm.nickname" placeholder="你的昵称" />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="profileForm.email" placeholder="your@email.com" />
        </el-form-item>
      </el-form>
        <template #footer>
          <el-button type="danger" plain @click="userStore.logout()">退出登录</el-button>
          <div style="flex:1" />
        <el-button @click="showProfile = false">取消</el-button>
        <el-button type="primary" :loading="savingProfile" @click="saveProfile">保存</el-button>
      </template>
    </el-dialog>
  </aside>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { Search, Plus, Setting, Camera } from '@element-plus/icons-vue'
import { useUserStore } from '../stores/user'
import { addCategory } from '../api/category'
import { ElMessage } from 'element-plus'
import request from '../utils/request'

const props = defineProps({
  categories: { type: Array, default: () => [] },
  activeNav: { type: String, default: 'all' },
  activeCategoryId: { type: Number, default: null },
  totalCount: { type: Number, default: 0 },
  favoriteCount: { type: Number, default: 0 },
})
const emit = defineEmits(['search', 'nav-change', 'category-change', 'category-added'])

const userStore = useUserStore()
const searchKeyword = ref('')
const showAddCategory = ref(false)
const showProfile = ref(false)
const savingProfile = ref(false)
const categoryForm = reactive({ name: '', color: '#4ecdc4' })
const fileInputRef = ref(null)

function triggerFileInput() {
  fileInputRef.value?.click()
}

async function onFileChange(e) {
  const file = e.target.files?.[0]
  if (!file) return
  if (file.size > 5 * 1024 * 1024) return ElMessage.warning('图片不能超过 5MB')
  const formData = new FormData()
  formData.append('file', file)
  try {
    const url = await request.post('/file/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    profileForm.avatar = typeof url === 'string' ? url : (url.url ?? url.data ?? url)
    ElMessage.success('上传成功')
  } catch {
    ElMessage.error('上传失败')
  }
  e.target.value = ''
}
const profileForm = reactive({ nickname: '', email: '', avatar: '' })
const colorOptions = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#a78bfa', '#fb923c', '#3a7d3f']

const displayName = computed(() => {
  if (userStore.userInfo?.nickname) return userStore.userInfo.nickname
  // fallback: decode from token
  const token = sessionStorage.getItem('token')
  if (!token) return '用户'
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.username || '用户'
  } catch { return '用户' }
})

const avatarChar = computed(() => displayName.value.charAt(0))

const navItems = computed(() => [
  { key: 'all', label: '全部笔记', icon: 'HomeFilled', count: props.totalCount },
  { key: 'favorite', label: '收藏夹', icon: 'StarFilled', count: props.favoriteCount },
])

function openProfile() {
  showProfile.value = true
}

function initProfileForm() {
  const info = userStore.userInfo
  profileForm.nickname = info?.nickname || ''
  profileForm.email = info?.email || ''
  profileForm.avatar = info?.avatar || ''
}

async function saveProfile() {
  savingProfile.value = true
  try {
    await userStore.updateProfile({
      nickname: profileForm.nickname,
      email: profileForm.email,
      avatar: profileForm.avatar,
    })
    ElMessage.success('保存成功')
    showProfile.value = false
  } finally {
    savingProfile.value = false
  }
}

async function submitCategory() {
  if (!categoryForm.name.trim()) return ElMessage.warning('请输入分类名称')
  await addCategory({ name: categoryForm.name, color: categoryForm.color })
  ElMessage.success('添加成功')
  showAddCategory.value = false
  categoryForm.name = ''
  emit('category-added')
}
</script>

<style scoped>
.sidebar {
  background: var(--surface);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  position: relative;
  width: 240px;
  flex-shrink: 0;
}

.logo {
  padding: 28px 22px 20px;
  display: flex; align-items: center; gap: 10px;
}

.logo-mark {
  width: 30px; height: 30px;
  background: var(--accent);
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  font-family: var(--font-mono); font-weight: 700; font-size: 13px;
  color: #fff;
  box-shadow: 0 2px 10px rgba(58,125,63,0.25);
}

.logo-text {
  font-family: var(--font-mono); font-size: 15px; font-weight: 700; color: var(--text);
}
.logo-text span { color: var(--accent); }

.search-wrap { padding: 0 16px 18px; }

.nav-section { padding: 0 10px; margin-bottom: 4px; }

.nav-label {
  font-size: 10px; font-family: var(--font-mono); color: var(--text-muted);
  letter-spacing: 0.12em; text-transform: uppercase; padding: 4px 12px 6px;
}

.nav-item {
  display: flex; align-items: center; gap: 9px;
  padding: 9px 12px; border-radius: 8px;
  cursor: pointer; color: var(--text-muted); font-size: 13.5px;
  transition: background 0.15s, color 0.15s;
}
.nav-item:hover { background: var(--surface3); color: var(--text); }
.nav-item.active { background: var(--accent-dim); color: var(--accent); }

.badge {
  margin-left: auto;
  background: var(--surface3); color: var(--text-muted);
  font-family: var(--font-mono); font-size: 10px;
  padding: 2px 6px; border-radius: 20px;
}
.nav-item.active .badge { background: rgba(58,125,63,0.12); color: var(--accent); }

.sidebar-divider { height: 1px; background: var(--border); margin: 8px 16px; }

.category-list { flex: 1; overflow-y: auto; padding: 0 10px; }

.category-item {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 12px; border-radius: 8px;
  cursor: pointer; color: var(--text-muted); font-size: 13px;
  transition: background 0.15s, color 0.15s;
}
.category-item:hover { background: var(--surface3); color: var(--text); }
.category-item.active { color: var(--text); background: var(--surface3); }

.category-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
.count { margin-left: auto; font-family: var(--font-mono); font-size: 11px; color: var(--text-dim); }

.add-btn { color: var(--accent); font-size: 12px; }

.user-area {
  padding: 14px 16px; border-top: 1px solid var(--border);
  display: flex; align-items: center; gap: 10px;
  cursor: pointer; transition: background 0.15s;
}
.user-area:hover { background: var(--surface2); }

.avatar {
  width: 32px; height: 32px; border-radius: 50%;
  background: linear-gradient(135deg, #667eea, #764ba2);
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 600; color: #fff; flex-shrink: 0;
  overflow: hidden;
}
.avatar-img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }

.user-info { flex: 1; min-width: 0; }
.user-name { font-size: 13px; font-weight: 500; color: var(--text); }
.user-role { font-size: 11px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.color-options { display: flex; gap: 8px; flex-wrap: wrap; }
.color-dot {
  width: 22px; height: 22px; border-radius: 50%; cursor: pointer;
  outline-offset: 3px; transition: transform 0.15s;
}
.color-dot:hover { transform: scale(1.15); }

/* 头像上传区 */
.avatar-upload { display: flex; align-items: center; gap: 12px; }
.avatar-preview {
  width: 56px; height: 56px; border-radius: 50%; flex-shrink: 0;
  background: linear-gradient(135deg, #667eea, #764ba2);
  display: flex; align-items: center; justify-content: center;
  font-size: 20px; font-weight: 600; color: #fff; overflow: hidden;
  position: relative; cursor: pointer;
}
.avatar-preview:hover .avatar-overlay { opacity: 1; }
.avatar-overlay {
  position: absolute; inset: 0; border-radius: 50%;
  background: rgba(0,0,0,0.45);
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 18px; opacity: 0; transition: opacity 0.2s;
}
.avatar-placeholder { font-size: 20px; font-weight: 600; color: #fff; }
.avatar-actions { display: flex; flex-direction: column; gap: 6px; }
.avatar-divider { font-size: 11px; color: var(--text-muted); text-align: center; }

:deep(.el-dialog__footer) { display: flex; align-items: center; }
</style>
