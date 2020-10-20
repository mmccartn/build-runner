import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { createSocket } from 'ws-plus/vue'
import App from '@/app.vue'
import IndexPage from '@/pages/index.vue'

createApp(App)
    .use(createRouter({
        routes: [{ path: '/', component: IndexPage }],
        history: createWebHistory()
    }))
    .use(createSocket(SERVER_URL))
    .mount('body')
