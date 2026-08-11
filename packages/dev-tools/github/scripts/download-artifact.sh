#!/usr/bin/env bash

set -euo pipefail

OWNER="blockeraai"
REPO="blockera"
ARTIFACT_NAME="blockera"
BRANCH=""
WORKFLOW=""
OUTPUT=""
EXTRACT_DIR=""
ARTIFACT_URL=""
TOKEN="${GITHUB_TOKEN:-}"
RUN_ID=""
ARTIFACT_ID=""

usage() {
	cat <<EOF
Usage: download-artifact.sh [options]

Download a GitHub Actions artifact from any repository.

Options:
  --owner OWNER       Repository owner (default: blockeraai)
  --repo REPO         Repository name (default: blockera)
  --name NAME         Artifact name (default: blockera)
  --branch BRANCH     Branch name to resolve the latest successful workflow run (optional)
  --workflow FILE     Workflow file name when using --branch (default: build-plugin-zip.yml)
  --url URL           GitHub Actions artifact page URL
                      (https://github.com/OWNER/REPO/actions/runs/RUN_ID/artifacts/ARTIFACT_ID)
  --output PATH       Output artifact zip file path (default: \$REPO.zip)
  --extract-dir PATH  Extract the plugin directory for wp-env (prints path to stdout)
  --help              Show this help

Environment:
  GITHUB_TOKEN        GitHub token for API authentication (required for cross-repo access)
EOF
}

log() {
	echo "$*" >&2
}

while [[ $# -gt 0 ]]; do
	case "$1" in
		--owner)
			OWNER="$2"
			shift 2
			;;
		--repo)
			REPO="$2"
			shift 2
			;;
		--name)
			ARTIFACT_NAME="$2"
			shift 2
			;;
		--branch)
			BRANCH="$2"
			shift 2
			;;
		--workflow)
			WORKFLOW="$2"
			shift 2
			;;
		--output)
			OUTPUT="$2"
			shift 2
			;;
		--extract-dir)
			EXTRACT_DIR="$2"
			shift 2
			;;
		--url)
			ARTIFACT_URL="$2"
			shift 2
			;;
		--help)
			usage
			exit 0
			;;
		*)
			log "Error: Unknown option '$1'"
			usage >&2
			exit 1
			;;
	esac
done

if [ -z "$TOKEN" ]; then
	log "Error: GITHUB_TOKEN environment variable is required."
	exit 1
fi

OUTPUT="${OUTPUT:-${REPO}.zip}"
WORKFLOW="${WORKFLOW:-build-plugin-zip.yml}"

parse_artifact_url() {
	local url="$1"

	if [[ ! "$url" =~ ^https://github.com/([^/]+)/([^/]+)/actions/runs/([0-9]+)/artifacts/([0-9]+)/?$ ]]; then
		log "Error: Invalid GitHub Actions artifact URL: $url"
		log "Expected: https://github.com/OWNER/REPO/actions/runs/RUN_ID/artifacts/ARTIFACT_ID"
		exit 1
	fi

	OWNER="${BASH_REMATCH[1]}"
	REPO="${BASH_REMATCH[2]}"
	RUN_ID="${BASH_REMATCH[3]}"
	ARTIFACT_ID="${BASH_REMATCH[4]}"
}

api() {
	curl -sfSL \
		-H "Authorization: Bearer $TOKEN" \
		-H "Accept: application/vnd.github+json" \
		-H "X-GitHub-Api-Version: 2022-11-28" \
		"$@"
}

find_artifact_in_run() {
	local run_id="$1"

	jq --arg name "$ARTIFACT_NAME" '
		.artifacts
		| map(select(.name == $name and .expired == false))
		| .[0].id // empty
	' <<< "$(api "https://api.github.com/repos/$OWNER/$REPO/actions/runs/$run_id/artifacts")"
}

resolve_artifact_from_branch() {
	local encoded_branch page run_id artifact_id

	encoded_branch=$(jq -rn --arg branch "$BRANCH" '$branch|@uri')

	for page in 1 2 3; do
		while IFS= read -r run_id; do
			[ -z "$run_id" ] && continue

			artifact_id=$(find_artifact_in_run "$run_id")
			if [ -n "$artifact_id" ]; then
				RUN_ID="$run_id"
				ARTIFACT_ID="$artifact_id"
				log "Using workflow run ID $RUN_ID from branch '$BRANCH' in $OWNER/$REPO."
				return 0
			fi
		done < <(
			api "https://api.github.com/repos/$OWNER/$REPO/actions/workflows/$WORKFLOW/runs?branch=${encoded_branch}&status=success&per_page=10&page=${page}" \
				| jq -r '.workflow_runs[].id // empty'
		)
	done

	log "Error: Artifact '$ARTIFACT_NAME' not found for branch '$BRANCH' in $OWNER/$REPO."
	exit 1
}

resolve_latest_artifact() {
	local artifact

	artifact=$(
		api "https://api.github.com/repos/$OWNER/$REPO/actions/artifacts?per_page=100" \
			| jq --arg name "$ARTIFACT_NAME" '
				.artifacts
				| map(select(.name == $name and .expired == false))
				| sort_by(.created_at)
				| reverse
				| .[0] // empty
			'
	)

	if [ -z "$artifact" ] || [ "$artifact" = "null" ]; then
		log "Error: Artifact '$ARTIFACT_NAME' not found in $OWNER/$REPO."
		exit 1
	fi

	ARTIFACT_ID=$(echo "$artifact" | jq -r '.id')
	RUN_ID=$(echo "$artifact" | jq -r '.workflow_run.id // empty')

	if [ -z "$RUN_ID" ]; then
		log "Error: Could not resolve workflow run ID for artifact $ARTIFACT_ID."
		exit 1
	fi
}

extract_plugin_dir() {
	local artifact_zip="$1"
	local extract_dir="$2"
	local staging_dir inner_zip

	staging_dir=$(mktemp -d)
	rm -rf "$extract_dir"
	mkdir -p "$extract_dir"

	unzip -qo "$artifact_zip" -d "$staging_dir"

	for inner_zip in \
		"$staging_dir/${ARTIFACT_NAME}.zip" \
		"$staging_dir/${REPO}.zip" \
		"$staging_dir/blockera.zip"; do
		if [ -f "$inner_zip" ]; then
			unzip -qo "$inner_zip" -d "$extract_dir"
			rm -rf "$staging_dir"
			break
		fi
	done

	if [ -d "$staging_dir" ]; then
		if [ -f "$staging_dir/blockera.php" ]; then
			mv "$staging_dir"/* "$extract_dir/"
			rm -rf "$staging_dir"
		else
			rm -rf "$staging_dir"
			log "Error: Could not find plugin zip inside downloaded artifact."
			exit 1
		fi
	fi

	if [ ! -f "$extract_dir/blockera.php" ]; then
		log "Error: Extracted plugin is missing blockera.php in $extract_dir."
		exit 1
	fi

	log "Extracted Blockera free plugin to $extract_dir"
}

if [ -n "$ARTIFACT_URL" ]; then
	parse_artifact_url "$ARTIFACT_URL"
	log "Using artifact from URL in $OWNER/$REPO (run $RUN_ID, artifact $ARTIFACT_ID)."
elif [ -n "$BRANCH" ]; then
	resolve_artifact_from_branch
else
	resolve_latest_artifact
fi

ARTIFACT_PAGE_URL="https://github.com/$OWNER/$REPO/actions/runs/$RUN_ID/artifacts/$ARTIFACT_ID"
DOWNLOAD_URL="https://api.github.com/repos/$OWNER/$REPO/actions/artifacts/$ARTIFACT_ID/zip"

log "Run ID: $RUN_ID"
log "Artifact ID: $ARTIFACT_ID"
log "Artifact page: $ARTIFACT_PAGE_URL"
log "Downloading from API: $DOWNLOAD_URL"

if [ -n "$EXTRACT_DIR" ]; then
	artifact_zip=$(mktemp)
	trap 'rm -f "$artifact_zip"' EXIT

	curl -sfSL \
		-H "Authorization: Bearer $TOKEN" \
		-H "Accept: application/vnd.github+json" \
		-H "X-GitHub-Api-Version: 2022-11-28" \
		-o "$artifact_zip" \
		"$DOWNLOAD_URL"

	extract_plugin_dir "$artifact_zip" "$EXTRACT_DIR"
	printf './%s\n' "${EXTRACT_DIR#./}"
else
	curl -sfSL \
		-H "Authorization: Bearer $TOKEN" \
		-H "Accept: application/vnd.github+json" \
		-H "X-GitHub-Api-Version: 2022-11-28" \
		-o "$OUTPUT" \
		"$DOWNLOAD_URL"

	echo "Downloaded as $OUTPUT"
fi
