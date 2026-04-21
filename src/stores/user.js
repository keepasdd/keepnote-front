import { defineStore } from 'pinia'
import { ref } from 'vue'
import { login as loginApi, register as registerApi, getUserInfo, updateUserInfo, logout as logoutApi } from '../api/user'
import router from '../router'
import { ElMessage } from 'element-plus'

export const useUserStore = defineStore('user', () => {
    const token = ref(sessionStorage.getItem('token') || '')
    const userInfo = ref(null)

    async function login(username, password) {
        const data = await loginApi({ username, password })
        token.value = data.token
        sessionStorage.setItem('token', data.token)
        userInfo.value = data.user
        // 检查是否是首次登录（没有昵称）
        if (!data.user.nickname) {
            // 首次登录，跳转到个人资料设置页面
            router.push('/?showProfile=true')
        } else {
            // 非首次登录，跳转到首页
            router.push('/')
        }
    }

    async function register(username, password) {
        await registerApi({ username, password })
    }

    async function logout() {
        try {
            await logoutApi()
        } catch (err) {
            ElMessage.error(err?.message || '退出登录失败，已清除本地登录状态')
        } finally {
            token.value = ''
            userInfo.value = null
            sessionStorage.removeItem('token')
            router.push('/login')
        }
    }

    async function fetchUserInfo() {
        userInfo.value = await getUserInfo()
    }

    async function updateProfile(data) {
        await updateUserInfo(data)
        await fetchUserInfo()
    }

    return { token, userInfo, login, register, logout, fetchUserInfo, updateProfile }
})
