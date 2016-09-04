module.exports = function(grunt) {

	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),

		babel: {
			options: {
				sourceMap: false,
				presets: ['es2015']
			},
			all: {
				files: {
					'dist/view.js': 'src/view.js'
				}
			}
		}

	});

	grunt.loadNpmTasks('grunt-babel');

	grunt.registerTask('default', 'babel');	

};