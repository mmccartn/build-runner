<template>
    <div class="container">
        <header>
            <h1>Client for C-Program Build Server</h1>
        </header>
        <register class="register"/>
        <builds class="builds"/>
        <footer>
            <p>mmccartn-2020</p>
        </footer>
    </div>
</template>

<script>
import builds from '@/components/builds.vue'
import register from '@/components/register.vue'

export default { components: { builds, register } }
</script>

<style lang="sass">
.container
    display: grid
    grid-template-areas: "header header" "builds register" "footer footer"
    grid-template-columns: 1fr 1fr
    grid-template-rows: auto 1fr auto
    grid-gap: 10px
    height: 100vh
    h2
        padding-bottom: 0.5rem
        margin-bottom: 0.5rem
    header
        grid-area: header
        text-align: center
        padding-top: 2rem
    .register
        grid-area: builds
        margin: 2rem
    .builds
        grid-area: register
        margin: 2rem
    footer
        grid-area: footer
        text-align: right
</style>
