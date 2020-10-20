<template>
    <div class="builds">
        <h2>Registered Program Builds</h2>
        <ul v-if="builds.length">
            <li>
                <h3 class="prog">Program Name</h3>
                <h3 class="stat">Build Status</h3>
            </li>
            <hr/>
            <li v-for="build in builds" :key="build.program">
                <p class="prog">{{ build.program }}</p>
                <p class="stat" :class="build.status">{{ build.status }}</p>
            </li>
        </ul>
        <div v-else>No builds to display</div>
    </div>
</template>

<script>
import { inject, ref } from 'vue'
import { listen } from 'ws-plus/vue'

export default {
    setup() {
        const builds = ref([])
        listen({
            'programs/registered': programs => builds.value = programs,
            'registry/update': ({ program, status }) => {
                const build = builds.value.find(bld => bld.program === program)
                if (build) {
                    build.status = status
                } else {
                    builds.value.push({ program, status })
                }
            }
        })
        const ws = inject('$ws')
        return { builds }
    }
}
</script>

<style lang="sass">
.builds
    li
        display: grid
        grid-template-areas: "prog stat"
        grid-template-columns: 1fr 1fr
        padding: 0.5rem
        .prog
            grid-area: prog
        .stat
            grid-area: stat
        .completed
            color: #DEFDE0
        .failed
            color: #FDDFDF
        .building
            color: #FCF7DE
</style>
