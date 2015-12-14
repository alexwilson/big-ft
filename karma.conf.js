module.exports = function (config) {
	config.set({
		basePath: '',
		frameworks: ['mocha'],

		plugins: [
			'karma-mocha',
			'karma-electron-launcher',
			'karma-webpack'
		],

		files: [
			'http://polyfill.webservices.ft.com/v1/polyfill.js?ua=safari/4&features=fetch,CustomEvent,Function.prototype.bind,Element.prototype.closest',
			{ pattern: './client/tests/*.spec.js', watched: true, included: true, served: true },
			{ pattern: './src/*.js', watched: true, included: false, served: true },
		],

		preprocessors: {
			'./client/tests/*.spec.js': ['webpack']
		},

		proxy : {
			'web' : 'http://localhost:3000/'
		},

		reporters: ['progress'],
		port: 9876,
		colors: true,
		// possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
		logLevel: config.LOG_INFO,
		browsers: ['Electron'],
		singleRun: false,
		webpack: {
			// quiet: true,
			module: {
				loaders: [
					{
						test: /\.js$/,
						exclude: /node_modules/,
						loaders: [
							'babel?optional[]=runtime',
							'imports?define=>false'
						]
					}
				]
			}
		},

		// Hide webpack output logging
		webpackMiddleware: {
			noInfo: true
		}

	});
};
