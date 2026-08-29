/** @typedef {import('@octokit/rest')} GitHub */
/** @typedef {import('@octokit/rest').IssuesListForRepoResponseItem} IssuesListForRepoResponseItem */
/** @typedef {import('@octokit/rest').IssuesListMilestonesForRepoResponseItem} OktokitIssuesListMilestonesForRepoResponseItem */

/**
 * @typedef {"open"|"closed"|"all"} IssueState
 */

const VERSION_SUFFIX =
	/^(.*)\s+(\d+(?:\.\d+)*(?:-[0-9A-Za-z.-]+)?)$/;

/**
 * @param {string} title
 * @return {string} Collapsed whitespace.
 */
function normalizeMilestoneTitle(title) {
	return String(title).trim().replace(/\s+/g, ' ');
}

/**
 * Split "Display Name 1.2.3" into prefix + version suffix.
 *
 * @param {string} title
 * @return {{ prefix: string, version: string }}
 */
function splitMilestonePrefixVersion(title) {
	const normalized = normalizeMilestoneTitle(title);
	const match = normalized.match(VERSION_SUFFIX);
	if (!match) {
		return { prefix: normalized, version: '' };
	}
	return { prefix: match[1], version: match[2] };
}

/**
 * @param {string} version
 * @return {string[]} Dotted numeric segments (prerelease stripped).
 */
function versionCoreSegments(version) {
	return String(version)
		.replace(/^v/, '')
		.split(/[-+]/)[0]
		.split('.')
		.filter(Boolean);
}

/**
 * True when one version is the same series as the other (shared leading
 * segments). `0.1` matches `0.1.0` / `0.1.1-rc.1`; `0.1` does not match `0.10`.
 *
 * @param {string} a
 * @param {string} b
 * @return {boolean}
 */
function isSameVersionSeries(a, b) {
	if (!a || !b) {
		return false;
	}
	const as = versionCoreSegments(a);
	const bs = versionCoreSegments(b);
	const length = Math.min(as.length, bs.length);
	if (length === 0) {
		return false;
	}
	for (let i = 0; i < length; i++) {
		if (as[i] !== bs[i]) {
			return false;
		}
	}
	return true;
}

/**
 * Pick a milestone whose title matches `requested`, or the same display-name
 * prefix + version series among `milestones`.
 *
 * @param {string} requested
 * @param {{ title: string }[]} milestones
 * @param {string} [releaseVersion]
 * @return {{ title: string }|undefined}
 */
function pickMilestoneByTitle(requested, milestones, releaseVersion) {
	const wanted = normalizeMilestoneTitle(requested);
	if (!wanted || !Array.isArray(milestones)) {
		return undefined;
	}

	const exact = milestones.find(
		(milestone) => normalizeMilestoneTitle(milestone.title) === wanted
	);
	if (exact) {
		return exact;
	}

	const parsedRequested = splitMilestonePrefixVersion(wanted);
	if (!parsedRequested.version) {
		return undefined;
	}

	const releaseCore = releaseVersion
		? versionCoreSegments(releaseVersion).join('.')
		: '';

	const candidates = milestones.filter((milestone) => {
		const parsed = splitMilestonePrefixVersion(milestone.title);
		return (
			parsed.prefix === parsedRequested.prefix &&
			parsed.version !== '' &&
			isSameVersionSeries(parsed.version, parsedRequested.version)
		);
	});

	if (candidates.length === 0) {
		return undefined;
	}
	if (candidates.length === 1) {
		return candidates[0];
	}

	const score = (milestone) => {
		const title = normalizeMilestoneTitle(milestone.title);
		const { version } = splitMilestonePrefixVersion(title);
		const core = versionCoreSegments(version).join('.');
		let points = 0;
		if (title === wanted) {
			points += 1000;
		}
		if (releaseCore && core === releaseCore) {
			points += 400;
		}
		if (version === parsedRequested.version) {
			points += 200;
		}
		points += versionCoreSegments(version).length * 10;
		if (releaseCore) {
			const rel = versionCoreSegments(releaseCore);
			const got = versionCoreSegments(version);
			let matched = 0;
			for (let i = 0; i < Math.min(rel.length, got.length); i++) {
				if (rel[i] === got[i]) {
					matched++;
				} else {
					break;
				}
			}
			points += matched * 50;
			if (
				rel.length >= 3 &&
				got.length >= 3 &&
				rel[0] === got[0] &&
				rel[1] === got[1]
			) {
				points +=
					30 -
					Math.min(30, Math.abs(Number(got[2]) - Number(rel[2])));
			}
		}
		return points;
	};

	return [...candidates].sort((a, b) => {
		const delta = score(b) - score(a);
		if (delta !== 0) {
			return delta;
		}
		return normalizeMilestoneTitle(a.title).localeCompare(
			normalizeMilestoneTitle(b.title)
		);
	})[0];
}

/**
 * Returns a promise resolving to a milestone by title, or the same prefix +
 * version series among repo milestones (e.g. `Name 0.1` → `Name 0.1.0`).
 *
 * @param {GitHub} octokit Initialized Octokit REST client.
 * @param {string} owner   Repository owner.
 * @param {string} repo    Repository name.
 * @param {string} title   Milestone title (often `name major.minor`).
 * @param {string} [releaseVersion] Product version being released (breaks ties).
 *
 * @return {Promise<OktokitIssuesListMilestonesForRepoResponseItem>} Promise resolving to milestone.
 */
async function getMilestoneByTitle(
	octokit,
	owner,
	repo,
	title,
	releaseVersion
) {
	const options = octokit.issues.listMilestonesForRepo.endpoint.merge({
		owner,
		repo,
		state: 'all',
	});

	/**
	 * @type {AsyncIterableIterator<import('@octokit/rest').Response<import('@octokit/rest').IssuesListMilestonesForRepoResponse>>}
	 */
	const responses = octokit.paginate.iterator(options);
	/** @type {OktokitIssuesListMilestonesForRepoResponseItem[]} */
	const all = [];

	for await (const response of responses) {
		all.push(...response.data);
	}

	const picked = pickMilestoneByTitle(title, all, releaseVersion);
	if (picked) {
		return picked;
	}

	const { prefix } = splitMilestonePrefixVersion(title);
	const nearby = all
		.map((milestone) => milestone.title)
		.filter(
			(candidate) =>
				splitMilestonePrefixVersion(candidate).prefix === prefix
		);

	const hint = nearby.length
		? ` Same-prefix titles: ${nearby.join(', ')}.`
		: '';
	throw new Error(`Cannot find milestone by title: ${title}.${hint}`);
}

/**
 * Returns a promise resolving to pull requests by a given milestone ID.
 *
 * @param {GitHub}     octokit       Initialized Octokit REST client.
 * @param {string}     owner         Repository owner.
 * @param {string}     repo          Repository name.
 * @param {number}     milestone     Milestone ID.
 * @param {IssueState} [state]       Optional issue state.
 * @param {string}     [closedSince] Optional timestamp.
 *
 * @return {Promise<IssuesListForRepoResponseItem[]>} Promise resolving to pull
 *                                                    requests for the given
 *                                                    milestone.
 */
async function getIssuesByMilestone(
	octokit,
	owner,
	repo,
	milestone,
	state,
	closedSince
) {
	const options = octokit.issues.listForRepo.endpoint.merge({
		owner,
		repo,
		milestone,
		state,
		...(closedSince && {
			since: closedSince,
		}),
	});

	/**
	 * @type {AsyncIterableIterator<import('@octokit/rest').Response<import('@octokit/rest').IssuesListForRepoResponse>>}
	 */
	const responses = octokit.paginate.iterator(options);

	/**
	 * @type {import('@octokit/rest').IssuesListForRepoResponse}
	 */
	const pulls = [];

	for await (const response of responses) {
		const issues = response.data;
		pulls.push(...issues);
	}

	if (closedSince) {
		const closedSinceTimestamp = new Date(closedSince);

		return pulls.filter(
			(pull) =>
				pull.closed_at &&
				closedSinceTimestamp <
					new Date(
						// The ugly `as unknown as string` cast is required because of
						// https://github.com/octokit/plugin-rest-endpoint-methods.js/issues/64
						// Fixed in Octokit v18.1.1, see https://github.com/WordPress/gutenberg/pull/29043
						/** @type {string} */ (
							/** @type {unknown} */ (pull.closed_at)
						)
					)
		);
	}

	return pulls;
}

module.exports = {
	getMilestoneByTitle,
	getIssuesByMilestone,
	pickMilestoneByTitle,
	splitMilestonePrefixVersion,
	isSameVersionSeries,
};
