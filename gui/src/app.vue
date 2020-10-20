<template>
	<router-view></router-view>
</template>

<script>
import '@/index.html'

export default {}
</script>

<style lang="sass">
// Reset default browser styles
*
    margin: 0
    padding: 0
    box-sizing: border-box

input
    font-size: inherit
    font-family: inherit

html, body
    height: 100%

body
    background: #222
    color: #eee
    font-size: 16px
    font-family: Helvetica, sans-serif
</style>
