#!/usr/bin/env bash
# Shared include/exclude patterns for leftover PR-only config files.
#
# Known live files (copied from *-example templates, must not merge):
#   .pr-workflows.json           CI allowedActions allowlist
#   .pr-cypress.env.json         Cypress PR spec filter
#   .pr-playwright.env.json      Playwright PR filter
#   .pr-env.json                 wp-env overlay
#   .pr-sync-env.json            repo sync metadata
#   .pr-github-playground.json   demo Playground JSON
#
# `.pr-*` is kept so a new `.pr-foo` name is still caught.
# Example templates stay via BLOCKERA_PR_CONFIG_EXCLUDE_NAMES.
#
# Override via env:
#   BLOCKERA_PR_CONFIG_NAME            space-separated find -name patterns
#   BLOCKERA_PR_CONFIG_EXCLUDE_NAMES   space-separated ! -name patterns

pr_config_default_names() {
	printf '%s' '.pr-* .pr-workflows.json .pr-cypress.env.json .pr-playwright.env.json .pr-env.json .pr-sync-env.json .pr-github-playground.json'
}

pr_config_default_excludes() {
	printf '%s' '*.env-example* *.example.* *-example* *.example.json'
}

# Print or delete matches. Args: -print (default) | -delete
pr_config_find() {
	local action="${1:--print}"
	local names="${BLOCKERA_PR_CONFIG_NAME:-$(pr_config_default_names)}"
	local excludes="${BLOCKERA_PR_CONFIG_EXCLUDE_NAMES:-$(pr_config_default_excludes)}"
	local find_args=(
		.
		\(
		-name node_modules
		-o -name .git
		-o -name vendor
		-o -name dist
		-o -name build
		\)
		-prune
		-o
		\(
		-type f
		\(
	)
	local first=1
	local pattern

	# noglob so "*.example.*" stays a find pattern, not a shell glob.
	set -f
	for pattern in ${names}; do
		if [[ "${first}" -eq 1 ]]; then
			find_args+=(-name "${pattern}")
			first=0
		else
			find_args+=(-o -name "${pattern}")
		fi
	done
	find_args+=(\))

	for pattern in ${excludes}; do
		find_args+=(! -name "${pattern}")
	done
	find_args+=(\) "${action}")
	set +f

	find "${find_args[@]}" 2>/dev/null || true
}
