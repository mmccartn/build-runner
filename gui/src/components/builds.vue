<template>
    <div class="builds">
        <h2>Build Status</h2>
        <ul v-if="builds.length">
            <li>
                <h3 class="prog">Program Name</h3>
                <h3 class="rev">Project revision</h3>
                <h3 class="stat">Build Status</h3>
            </li>
            <hr/>
            <li v-for="build in builds" :key="build.program">
                <p class="prog">{{ build.name }}</p>
                <p class="rev">{{ build.revision }}</p>
                <p class="stat" :class="build.status">{{ build.status }}</p>
            </li>
        </ul>
        <div v-else>No builds to display</div>
    </div>
</template>

<script>
import { computed, inject, ref } from 'vue'
import { listen } from 'ws-plus/vue'

export default {
    setup() {
        const builds = ref({})
        listen({
            'programs/registered': programs => builds.value = programs,
            'registry/update': prog => builds.value[prog.id] = prog,
            'registry/remove': ({ id }) => delete builds.value[id]
        })
        const ws = inject('$ws')
        return { builds: computed(() => Object.values(builds.value)) }
    }
}
</script>

<style lang="sass">
.builds
    li
        display: grid
        grid-template-areas: "prog rev stat"
        grid-template-columns: 1fr 1fr 1fr
        padding: 0.5rem
        .prog
            grid-area: prog
        .rev
            grid-area: rev
        .stat
            grid-area: stat
        .completed
            color: #DEFDE0
        .failed
            color: #FDDFDF
        .building
            color: #FCF7DE
</style>
