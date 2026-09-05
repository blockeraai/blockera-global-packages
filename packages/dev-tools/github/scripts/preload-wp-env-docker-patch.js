/**
 * NODE_OPTIONS --require hook: patch wp-env WordPress Dockerfiles as they are
 * written under the wp-env work directory.
 *
 * Skip with BLOCKERA_WP_ENV_SKIP_DOCKER_PATCH=true.
 */
if (process.env.BLOCKERA_WP_ENV_SKIP_DOCKER_PATCH === 'true') {
	return;
}

const fs = require('fs');
const {
	injectWordpressDockerfileWrite,
	isWordpressDockerfilePath,
} = require('./inject-wp-env-dockerfile');

const originalWriteFile = fs.promises.writeFile.bind(fs.promises);
let logged = false;

fs.promises.writeFile = async function writeFileWithWpEnvDockerPatch(
	file,
	data,
	options
) {
	if (isWordpressDockerfilePath(file)) {
		const source =
			typeof data === 'string'
				? data
				: Buffer.isBuffer(data)
					? data.toString('utf8')
					: data;

		if (typeof source === 'string') {
			data = injectWordpressDockerfileWrite(source);

			if (!logged) {
				logged = true;
				console.log(
					'👉 wp-env: injecting apt-get update into WordPress Dockerfiles'
				);
			}
		}
	}

	return originalWriteFile(file, data, options);
};
