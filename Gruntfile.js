/* eslint-env node, es6 */
module.exports = function ( grunt ) {
	var conf = grunt.file.readJSON( 'extension.json' );

	grunt.loadNpmTasks( 'grunt-banana-checker' );
	grunt.loadNpmTasks( 'grunt-stylelint' );
	grunt.loadNpmTasks( 'grunt-eslint' );

	grunt.initConfig( {
		eslint: {
			options: {
				cache: true,
				fix: grunt.option( 'fix' )
			},
			all: [
				'**/*.{js,json}',
				'!node_modules/**',
				'!vendor/**'
			]
		},
		banana: conf.MessagesDirs,
		stylelint: {
			options: {
				fix: grunt.option( 'fix' ),
				cache: true
			},
			all: [
				'*.{less,css}',
				'**/*.{less,css}',
				'!node_modules/**',
				'!vendor/**'
			]
		}
	} );

	grunt.registerTask( 'test', [ 'eslint', 'banana', 'stylelint' ] );
	grunt.registerTask( 'fix', function () {
		grunt.config.set( 'eslint.options.fix', true );
		grunt.config.set( 'stylelint.options.fix', true );
		grunt.task.run( [ 'eslint', 'banana', 'stylelint' ] );
	} );
	grunt.registerTask( 'default', 'test' );
};
