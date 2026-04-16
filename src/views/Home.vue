<template>
  <div class="home">
    <Sidebar
      :categories="categories"
      :active-nav="activeNav"
      :active-category-id="activeCategoryId"
      :total-count="allCount"
      :favorite-count="favoriteCount"
      @search="onSearch"
      @nav-change="onNavChange"
      @category-change="onCategoryChange"
      @category-added="loadCategories"
    />

    <NoteList
      :notes="notes"
      :tags="tags"
      :categories="categories"
      :total="total"
      :page-size="pageSize"
      :loading="listLoading"
      :active-note-id="activeNoteId"
      :active-category-id="activeCategoryId"
      :title="listTitle"
      @select="onSelectNote"
      @new-note="onNewNote"
      @filter-change="onFilterChange"
      @tag-added="onTagChanged"
      @category-deleted="onCategoryDeleted"
    />

    <NoteDetail
      :note="activeNote"
      :is-editing="isEditing"
      :categories="categories"
      :tags="tags"
      @saved="onSaved"
      @deleted="onDeleted"
      @cancel-edit="isEditing = false"
      @toggle-favorite="onToggleFavorite"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import Sidebar from '../components/Sidebar.vue'
import NoteList from '../components/NoteList.vue'
import NoteDetail from '../components/NoteDetail.vue'
import { getNoteList, getNoteDetail, updateNote } from '../api/note'
import { getCategoryList } from '../api/category'
import { getTagList } from '../api/tag'

// ---- 状态 ----
const notes = ref([])
const categories = ref([])
const tags = ref([])
const total = ref(0)
const allCount = ref(0)
const favoriteCount = ref(0)
const listLoading = ref(false)

const activeNav = ref('all')
const activeCategoryId = ref(null)
const activeNoteId = ref(null)
const activeNote = ref(null)
const isEditing = ref(false)

const keyword = ref('')
const currentPage = ref(1)
const pageSize = 20
const dateRange = ref('')
const activeTagId = ref(null)

const listTitle = computed(() => {
  if (activeNav.value === 'favorite') return '收藏夹'
  const cat = categories.value.find(c => c.id === activeCategoryId.value)
  return cat ? cat.name : '全部笔记'
})

// ---- 加载数据 ----
async function loadNotes() {
  listLoading.value = true
  try {
    const params = {
      page: currentPage.value,
      pageSize,
      keyword: keyword.value || undefined,
      categoryId: activeCategoryId.value || undefined,
      tagId: activeTagId.value || undefined,
      isFavorite: activeNav.value === 'favorite' ? 1 : undefined,
      dateRange: dateRange.value || undefined,
    }
    const data = await getNoteList(params)
    notes.value = data.records
    total.value = data.total
  } finally {
    listLoading.value = false
  }
}

async function loadCategories() {
  categories.value = await getCategoryList()
}

async function loadTags() {
  tags.value = await getTagList()
}

async function loadFavoriteCount() {
  const data = await getNoteList({ pageSize: 1, isFavorite: 1 })
  favoriteCount.value = data.total
}

async function loadAllCount() {
  const data = await getNoteList({ pageSize: 1 })
  allCount.value = data.total
}

async function loadSidebarCounts() {
  await Promise.all([loadAllCount(), loadFavoriteCount()])
}

onMounted(async () => {
  await Promise.all([loadNotes(), loadCategories(), loadTags(), loadSidebarCounts()])
})

// ---- 交互事件 ----
async function onSelectNote(id) {
  activeNoteId.value = id
  isEditing.value = false
  activeNote.value = await getNoteDetail(id)
}

function onNewNote() {
  activeNoteId.value = null
  activeNote.value = null
  isEditing.value = true
}

function onSearch(kw) {
  keyword.value = kw
  currentPage.value = 1
  loadNotes()
}

function onNavChange(key) {
  activeNav.value = key
  activeCategoryId.value = null
  currentPage.value = 1
  loadNotes()
}

function onCategoryChange(id) {
  activeCategoryId.value = id
  activeNav.value = 'all'
  currentPage.value = 1
  loadNotes()
}

function onFilterChange({ page, dateRange: dr, tagId }) {
  currentPage.value = page
  dateRange.value = dr
  activeTagId.value = tagId
  loadNotes()
}

async function onTagChanged() {
  await loadTags()
  await loadNotes()
  if (activeNoteId.value) {
    activeNote.value = await getNoteDetail(activeNoteId.value)
  }
}

async function onCategoryDeleted({ deletedCategoryId, targetCategoryId }) {
  if (activeCategoryId.value === deletedCategoryId) {
    activeCategoryId.value = targetCategoryId ?? null
  }
  if (activeNote.value?.categoryId === deletedCategoryId && targetCategoryId) {
    activeNote.value.categoryId = targetCategoryId
  }
  await Promise.all([loadCategories(), loadNotes(), loadSidebarCounts()])
  if (activeNoteId.value) {
    activeNote.value = await getNoteDetail(activeNoteId.value)
  }
}

async function onSaved(payload) {
  // 如果是触发编辑模式（从 NoteDetail 内部点编辑按钮）
  if (payload?._editMode) {
    isEditing.value = true
    return
  }
  isEditing.value = false
  await Promise.all([loadNotes(), loadSidebarCounts()])
  // 刷新详情
  if (activeNoteId.value) {
    activeNote.value = await getNoteDetail(activeNoteId.value)
    // 立即更新标签显示，避免后端延迟
    if (payload && payload.tagIds && tags.value.length) {
      const tagMap = new Map()
      // 构建标签映射（支持树形结构）
      const buildTagMap = (tagList) => {
        for (const tag of tagList) {
          tagMap.set(tag.id, tag)
          if (tag.children) {
            buildTagMap(tag.children)
          }
        }
      }
      buildTagMap(tags.value)
      activeNote.value.tags = payload.tagIds.map(id => tagMap.get(id)).filter(Boolean)
    }
  }
}

async function onDeleted() {
  activeNote.value = null
  activeNoteId.value = null
  await Promise.all([loadNotes(), loadSidebarCounts()])
}

async function onToggleFavorite(id) {
  const note = activeNote.value
  await updateNote({ id, isFavorite: note.isFavorite ? 0 : 1 })
  activeNote.value = await getNoteDetail(id)
  await Promise.all([loadNotes(), loadSidebarCounts()])
}
</script>

<style scoped>
.home {
  display: grid;
  grid-template-columns: 240px 1fr 340px;
  height: 100vh;
  overflow: hidden;
  background: var(--bg);
  color: var(--text);
}
</style>
