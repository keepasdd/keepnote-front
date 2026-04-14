<template>
  <div class="note-view">
    <div class="note-view-header">
      <el-button :icon="ArrowLeft" circle size="small" @click="router.back()" />
      <span class="note-view-id" v-if="note">#{{ String(note.id).padStart(4, '0') }}</span>
      <div class="actions" v-if="note">
        <el-tooltip content="收藏">
          <el-button :icon="note.isFavorite ? StarFilled : Star" circle size="small" @click="toggleFavorite" />
        </el-tooltip>
        <el-tooltip content="编辑">
          <el-button :icon="Edit" circle size="small" @click="startEdit" />
        </el-tooltip>
        <el-tooltip content="删除">
          <el-button :icon="Delete" circle size="small" type="danger" plain @click="confirmDelete" />
        </el-tooltip>
      </div>
    </div>

    <div v-if="loading" class="note-view-loading">
      <el-skeleton :rows="6" animated />
    </div>

    <template v-else-if="note && !isEditing">
      <div class="note-view-meta">
        <div class="note-view-title">{{ note.title }}</div>
        <div class="info-row">
          <span class="info-item"><el-icon><Calendar /></el-icon> {{ note.updatedAt }}</span>
          <span class="info-item"><el-icon><Document /></el-icon> {{ wordCount }} 字</span>
          <span class="info-item" v-if="note.categoryName">
            <span class="dot" :style="{ background: note.categoryColor }" /> {{ note.categoryName }}
          </span>
        </div>
        <div class="tag-row">
          <span
            v-for="tag in note.tags" :key="tag.id"
            class="tag-pill"
            :style="{ background: tag.color + '18', color: tag.color }"
          >{{ tag.name }}</span>
        </div>
      </div>

      <div class="note-view-divider" />

      <div class="stats-row">
        <div class="stat"><div class="stat-num">{{ wordCount }}</div><div class="stat-label">字数</div></div>
        <div class="stat"><div class="stat-num">{{ readTime }}</div><div class="stat-label">分钟读</div></div>
        <div class="stat"><div class="stat-num">{{ note.tags?.length || 0 }}</div><div class="stat-label">标签</div></div>
      </div>

      <div class="note-view-body">
        <div class="note-view-content" v-html="renderedContent" />
      </div>

      <!-- 只读模式附件展示 -->
      <div v-if="attachments.length" class="attachments-section readonly">
        <div class="attachments-title">附件 ({{ attachments.length }})</div>
        <!-- 图片网格 -->
        <div v-if="imageAttachments.length" class="image-grid">
          <a
            v-for="att in imageAttachments" :key="att.id"
            :href="att.url" target="_blank" rel="noopener"
            class="image-thumb-wrap"
            :title="att.fileName"
          >
            <img :src="att.url" :alt="att.fileName" class="image-thumb" />
            <div class="image-thumb-name">{{ att.fileName }}</div>
          </a>
        </div>
        <!-- 非图片列表 -->
        <div v-if="fileAttachments.length" class="attachments-list" :style="imageAttachments.length ? 'margin-top:10px' : ''">
          <div v-for="att in fileAttachments" :key="att.id" class="attachment-item">
            <el-icon class="att-icon"><Document /></el-icon>
            <span class="att-name" :title="att.fileName">{{ att.fileName }}</span>
            <span class="att-size">{{ formatSize(att.fileSize) }}</span>
            <el-button :icon="Download" circle size="small" @click="downloadAttachment(att)" />
          </div>
        </div>
      </div>
    </template>

    <!-- 编辑模式 -->
    <template v-else-if="isEditing">
      <div class="note-view-meta">
        <input v-model="editForm.title" class="title-input" placeholder="笔记标题…" autofocus />
        <div class="meta-row">
          <el-select v-model="editForm.categoryId" placeholder="选择分类" size="small" clearable style="width:120px">
            <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
          <el-select v-model="editForm.tagIds" placeholder="添加标签" size="small" multiple clearable style="width:180px">
            <el-option v-for="t in tags" :key="t.id" :label="t.name" :value="t.id" />
          </el-select>
        </div>
      </div>
      <div class="note-view-divider" />
      <div class="note-view-body">
        <textarea ref="editorRef" v-model="editForm.content" class="content-editor" placeholder="开始记录你的想法…" />
      </div>

      <!-- 附件区域 -->
      <div class="attachments-section">
        <div class="attachments-header">
          <span class="attachments-title">附件</span>
          <el-upload :show-file-list="false" :before-upload="handleUpload" multiple>
            <el-button size="small" :icon="Paperclip" :loading="uploading">上传文件</el-button>
          </el-upload>
        </div>
        <div v-if="attachments.length" class="attachments-list">
          <!-- 图片网格（编辑模式） -->
          <div v-if="imageAttachments.length" class="image-grid">
            <div v-for="att in imageAttachments" :key="att.id" class="image-thumb-wrap edit">
              <img :src="att.url" :alt="att.fileName" class="image-thumb" />
              <div class="image-thumb-name">{{ att.fileName }}</div>
              <div class="image-thumb-actions">
                <el-tooltip content="插入引用"><el-button :icon="Plus" circle size="small" @click="insertAttachment(att)" /></el-tooltip>
                <el-tooltip content="下载"><el-button :icon="Download" circle size="small" @click="downloadAttachment(att)" /></el-tooltip>
                <el-tooltip content="删除"><el-button :icon="Close" circle size="small" type="danger" plain @click="removeAttachment(att)" /></el-tooltip>
              </div>
            </div>
          </div>
          <!-- 非图片行列表（编辑模式） -->
          <template v-if="fileAttachments.length">
            <div v-for="att in fileAttachments" :key="att.id" class="attachment-item" :style="imageAttachments.length ? 'margin-top:6px' : ''">
              <el-icon class="att-icon"><Document /></el-icon>
              <span class="att-name" :title="att.fileName">{{ att.fileName }}</span>
              <span class="att-size">{{ formatSize(att.fileSize) }}</span>
              <div class="att-actions">
                <el-tooltip content="插入引用到笔记">
                  <el-button :icon="Plus" circle size="small" @click="insertAttachment(att)" />
                </el-tooltip>
                <el-tooltip content="下载">
                  <el-button :icon="Download" circle size="small" @click="downloadAttachment(att)" />
                </el-tooltip>
                <el-tooltip content="删除附件">
                  <el-button :icon="Close" circle size="small" type="danger" plain @click="removeAttachment(att)" />
                </el-tooltip>
              </div>
            </div>
          </template>
        </div>
        <div v-else class="attachments-empty">暂无附件，上传文件可辅助记录</div>
      </div>

      <div class="edit-footer">
        <el-button @click="isEditing = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Edit, Delete, Star, StarFilled, Calendar, Document, Paperclip, Plus, Download, Close } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getNoteDetail, updateNote, deleteNote, uploadAttachment, deleteAttachment } from '../api/note'
import { getCategoryList } from '../api/category'
import { getTagList } from '../api/tag'

const route = useRoute()
const router = useRouter()

const note = ref(null)
const loading = ref(true)
const isEditing = ref(false)
const saving = ref(false)
const uploading = ref(false)
const categories = ref([])
const tags = ref([])
const attachments = ref([])
const editorRef = ref(null)
const editForm = reactive({ id: null, title: '', content: '', categoryId: null, tagIds: [] })

onMounted(async () => {
  const id = Number(route.params.id)
  const [detail, cats, tagList] = await Promise.all([
    getNoteDetail(id),
    getCategoryList(),
    getTagList(),
  ])
  note.value = detail
  categories.value = cats
  tags.value = tagList
  attachments.value = detail.attachments || []
  loading.value = false
})

const wordCount = computed(() => note.value?.content?.replace(/<[^>]+>/g, '').length || 0)
const readTime = computed(() => Math.max(1, Math.ceil(wordCount.value / 300)))
const renderedContent = computed(() => note.value?.content?.replace(/\n/g, '<br>') || '')
const imageAttachments = computed(() => attachments.value.filter(a => isImage(a.fileName)))
const fileAttachments = computed(() => attachments.value.filter(a => !isImage(a.fileName)))

function isImage(fileName) {
  return /\.(png|jpe?g|gif|webp|svg)$/i.test(fileName)
}

function formatSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function startEdit() {
  editForm.id = note.value.id
  editForm.title = note.value.title
  editForm.content = note.value.content || ''
  editForm.categoryId = note.value.categoryId || null
  editForm.tagIds = note.value.tags?.map(t => t.id) || []
  isEditing.value = true
}

async function handleUpload(file) {
  uploading.value = true
  try {
    const result = await uploadAttachment(editForm.id, file)
    attachments.value.push(result)
    ElMessage.success(`${file.name} 上传成功`)
  } catch {
    // error already shown by request interceptor
  } finally {
    uploading.value = false
  }
  return false // prevent el-upload default behavior
}

function insertAttachment(att) {
  const textarea = editorRef.value
  const ref = isImage(att.fileName)
    ? `![${att.fileName}](${att.url})`
    : `[${att.fileName}](${att.url})`
  if (textarea) {
    const start = textarea.selectionStart
    const before = editForm.content.slice(0, start)
    const after = editForm.content.slice(start)
    editForm.content = before + '\n' + ref + '\n' + after
  } else {
    editForm.content += '\n' + ref
  }
  ElMessage.success('已插入引用')
}

function downloadAttachment(att) {
  const a = document.createElement('a')
  a.href = att.url
  a.download = att.fileName
  a.click()
}

async function removeAttachment(att) {
  await ElMessageBox.confirm(`确定删除附件 "${att.fileName}"？`, '提示', { type: 'warning' })
  await deleteAttachment(att.id)
  attachments.value = attachments.value.filter(a => a.id !== att.id)
  ElMessage.success('附件已删除')
}

async function save() {
  if (!editForm.title.trim()) return ElMessage.warning('标题不能为空')
  saving.value = true
  try {
    await updateNote(editForm)
    ElMessage.success('保存成功')
    const detail = await getNoteDetail(editForm.id)
    note.value = detail
    attachments.value = detail.attachments || []
    isEditing.value = false
  } finally {
    saving.value = false
  }
}

async function confirmDelete() {
  await ElMessageBox.confirm('确定删除这篇笔记吗？', '提示', { type: 'warning' })
  await deleteNote(note.value.id)
  ElMessage.success('已删除')
  router.back()
}

async function toggleFavorite() {
  await updateNote({ id: note.value.id, isFavorite: note.value.isFavorite ? 0 : 1 })
  const detail = await getNoteDetail(note.value.id)
  note.value = detail
  attachments.value = detail.attachments || []
}
</script>

<style scoped>
.note-view {
  max-width: 760px;
  margin: 0 auto;
  padding: 32px 24px 60px;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.note-view-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 28px;
  flex-shrink: 0;
}
.note-view-id {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-dim);
  flex: 1;
}
.actions { display: flex; gap: 6px; }

.note-view-loading { padding: 40px 0; }

.note-view-meta { flex-shrink: 0; }
.note-view-title {
  font-family: var(--font-serif);
  font-size: 26px;
  font-weight: 700;
  color: var(--text);
  line-height: 1.3;
  margin-bottom: 12px;
}

.title-input {
  width: 100%; background: none; border: none; outline: none;
  font-family: var(--font-serif); font-size: 26px; font-weight: 700;
  color: var(--text); line-height: 1.3; margin-bottom: 14px; display: block;
}

.info-row { display: flex; align-items: center; gap: 14px; margin-bottom: 12px; flex-wrap: wrap; }
.info-item { display: flex; align-items: center; gap: 5px; font-size: 11px; color: var(--text-muted); font-family: var(--font-mono); }
.dot { width: 7px; height: 7px; border-radius: 50%; display: inline-block; }

.meta-row { display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }

.tag-row { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 16px; }
.tag-pill { font-size: 11px; padding: 3px 10px; border-radius: 6px; }

.note-view-divider { height: 1px; background: var(--border); margin-bottom: 0; flex-shrink: 0; }

.stats-row { display: flex; gap: 1px; padding: 14px 0; flex-shrink: 0; }
.stat { flex: 1; background: var(--surface2); padding: 10px 12px; text-align: center; }
.stat:first-child { border-radius: 8px 0 0 8px; }
.stat:last-child { border-radius: 0 8px 8px 0; }
.stat-num { font-family: var(--font-mono); font-size: 18px; font-weight: 700; color: var(--accent); line-height: 1; }
.stat-label { font-size: 10px; color: var(--text-muted); margin-top: 3px; }

.note-view-body { flex: 1; padding: 20px 0 0; }
.note-view-content { font-size: 15px; color: var(--text-muted); line-height: 1.9; }

.content-editor {
  width: 100%; min-height: 400px; height: 100%;
  background: none; border: none; outline: none; resize: none;
  font-size: 15px; color: var(--text-muted); line-height: 1.9;
}

/* 附件区域 */
.attachments-section {
  margin-top: 20px;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 14px 16px;
  flex-shrink: 0;
}
.attachments-section.readonly {
  background: var(--surface2);
}
.attachments-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.attachments-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.attachments-list { display: flex; flex-direction: column; gap: 6px; }
.attachment-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border-radius: 7px;
  background: var(--surface2);
  font-size: 13px;
}
.att-icon { color: var(--accent); flex-shrink: 0; }
.att-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text);
}
.att-size { font-size: 11px; color: var(--text-dim); font-family: var(--font-mono); flex-shrink: 0; }
.att-actions { display: flex; gap: 4px; flex-shrink: 0; }
.attachments-empty { font-size: 12px; color: var(--text-dim); text-align: center; padding: 10px 0; }

/* 图片网格 */
.image-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 4px;
}
.image-thumb-wrap {
  position: relative;
  width: 100px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--border);
  text-decoration: none;
  cursor: pointer;
  flex-shrink: 0;
}
.image-thumb-wrap.edit {
  width: 110px;
}
.image-thumb {
  width: 100%;
  height: 80px;
  object-fit: cover;
  display: block;
}
.image-thumb-name {
  font-size: 10px;
  color: var(--text-muted);
  padding: 4px 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  background: var(--surface2);
}
.image-thumb-actions {
  display: flex;
  justify-content: center;
  gap: 3px;
  padding: 4px 4px;
  background: var(--surface2);
  border-top: 1px solid var(--border);
}

.edit-footer {
  display: flex; justify-content: flex-end; gap: 8px;
  padding: 16px 0 0; flex-shrink: 0;
}
</style>
