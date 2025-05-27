export default {
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: 'index.html',
        timelapse: 'timelapse/index.html',
        sdo_lasco: 'sdo_lasco/index.html',
        aia_and_solar_orbiter: 'aia_and_solar_orbiter/index.html',
        render_techniques: 'render_techniques/index.html',
        punch: 'punch/index.html'
      }
    }
  }
}
