import resolve from 'rollup-plugin-node-resolve';
import replace from 'rollup-plugin-replace';
import commonjs from 'rollup-plugin-commonjs';
import svelte from 'rollup-plugin-svelte';
import babel from 'rollup-plugin-babel';
import { terser } from 'rollup-plugin-terser';
import config from 'sapper/config/rollup.js';
import pkg from './package.json';
import typescript from 'rollup-plugin-typescript2';
import sass from 'node-sass';

const mode = process.env.NODE_ENV;
const dev = mode === 'development';
const legacy = !!process.env.SAPPER_LEGACY_BUILD;

export default {
	client: {
		input: config.client.input(),
		output: config.client.output(),
		plugins: [
			typescript({
				typescript: require('typescript')
			}),
			replace({
				'process.browser': true,
				'process.env.NODE_ENV': JSON.stringify(mode)
			}),
			svelte({
				// process SCSS in components
				preprocess: {
					style: ({ content, attributes }) => {
						if (attributes.type !== 'text/scss') return;

						return new Promise((fulfill, reject) => {
							sass.render({
								data: content,
								includePaths: ['src', 'node_modules'],
								sourceMap: true,
								outFile: 'x' // this is necessary, but is ignored
							}, (err, result) => {
								if (err) return reject(err);

								fulfill({
									code: result.css.toString(),
									map: result.map.toString()
								});
							});
						});
					}
				},
				dev,
				hydratable: true,
				emitCss: true
			}),
			resolve(),
			commonjs(),

			legacy && babel({
				extensions: ['.js', '.html'],
				runtimeHelpers: true,
				exclude: ['node_modules/@babel/**'],
				presets: [
					['@babel/preset-env', {
						targets: '> 0.25%, not dead'
					}]
				],
				plugins: [
					'@babel/plugin-syntax-dynamic-import',
					['@babel/plugin-transform-runtime', {
						useESModules: true
					}]
				]
			}),

			!dev && terser({
				module: true
			})
		],
	},

	server: {
		input: config.server.input(),
		output: config.server.output(),
		plugins: [
			typescript({
				typescript: require('typescript')
			}),
			replace({
				'process.browser': false,
				'process.env.NODE_ENV': JSON.stringify(mode)
			}),
			svelte({
				// process SCSS in components
				preprocess: {
					style: ({ content, attributes }) => {
						if (attributes.type !== 'text/scss') return;

						return new Promise((fulfill, reject) => {
							sass.render({
								data: content,
								includePaths: ['src', 'node_modules'],
								sourceMap: true,
								outFile: 'x' // this is necessary, but is ignored
							}, (err, result) => {
								if (err) return reject(err);

								fulfill({
									code: result.css.toString(),
									map: result.map.toString()
								});
							});
						});
					}
				},
				generate: 'ssr',
				dev
			}),
			resolve(),
			commonjs()
		],
		external: Object.keys(pkg.dependencies).concat(
			require('module').builtinModules || Object.keys(process.binding('natives'))
		),
	},

	serviceworker: {
		input: config.serviceworker.input(),
		output: config.serviceworker.output(),
		plugins: [
			resolve(),
			replace({
				'process.browser': true,
				'process.env.NODE_ENV': JSON.stringify(mode)
			}),
			commonjs(),
			!dev && terser()
		]
	}
};
