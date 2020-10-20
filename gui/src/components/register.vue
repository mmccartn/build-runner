<template>
    <div class="register">
        <h2>Register a Program at: {{ serverUrl }}</h2>
        <span>
            <input v-model="programPath" placeholder="path/to/program">
            <button @click="register" :disabled="!programPath">Register</button>
        </span>
        <div class="log">
            <ul v-if="logs.length">
                <li v-for="({ program, msg }, index) in logs" :key="index">
                    <p>&gt;&nbsp;[{{ program }}]: {{ msg }}</p>
                </li>
            </ul>
            <p v-else>No logs to display</p>
        </div>
    </div>
</template>

<script>
import { inject, ref } from 'vue'
import { listen } from 'ws-plus/vue'

export default {
    setup() {
        const logs = ref([])
        listen({ 'build/output': msg => logs.value.push(msg) })
        const ws = inject('$ws')
        const programPath = ref('')
        return {
            serverUrl: SERVER_URL,
            logs,
            programPath,
            register() {
                logs.value = []
                return ws.send(
                    'program/register',
                    { location: programPath.value }
                )
            }
        }
    }
}
</script>

<style lang="sass">
.register
    span, .log
        padding: 0.5rem
    span
        display: flex
        input
            flex-grow: 4
        button
            flex-grow: 1
    .log
        overflow-y: auto
        overflow-x: hidden
        height: 20rem
</style>
