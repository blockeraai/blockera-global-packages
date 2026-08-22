#!/usr/bin/env bash
# Configure git identity for release commits.
#
# Optional:
#   BLOCKERA_BUILD_ZIP_GIT_NAME   default: blockerabot
#   BLOCKERA_BUILD_ZIP_GIT_EMAIL  default: blockeraai+githubbot@gmail.com
set -euo pipefail

GIT_NAME="${BLOCKERA_BUILD_ZIP_GIT_NAME:-blockerabot}"
GIT_EMAIL="${BLOCKERA_BUILD_ZIP_GIT_EMAIL:-blockeraai+githubbot@gmail.com}"

git config user.name "${GIT_NAME}"
git config user.email "${GIT_EMAIL}"
