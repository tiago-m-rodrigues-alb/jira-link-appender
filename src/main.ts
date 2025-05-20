import * as core from '@actions/core';
import * as github from '@actions/github';
import type { PullRequest } from '@octokit/webhooks-types';
import { extractIssueId } from './extract-issue-id.js';

const DEFAULT_ISSUE_REGEX = /[A-Z,a-z]{2,}-\d{1,}/;

/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const githubToken = core.getInput('GITHUB_TOKEN');
    const octokit = github.getOctokit(githubToken);

    const pullRequest = github.context.payload.pull_request as
      | PullRequest
      | undefined;

    if (pullRequest === null || pullRequest === undefined) {
      core.setFailed('No pull request found.');

      return;
    }

    const title = pullRequest.title.trim();
    const branchName = pullRequest.head.ref.trim();

    const failIfIssueNotFound =
      core.getInput('fail-if-issue-not-found') === 'true';
    const jiraProjectUrl = core.getInput('jira-project-url');
    const pattern = new RegExp(
      core.getInput('jira-issue-regex') || DEFAULT_ISSUE_REGEX
    );

    core.info(`Title: ${title}`);
    core.info(`Branch: ${branchName}`);
    core.info(`JIRA project URL: ${jiraProjectUrl}`);
    core.info(`Regex: ${pattern}`);

    const issueId =
      extractIssueId(title, pattern) || extractIssueId(branchName, pattern);

    if (issueId === null) {
      const message = `\`${pattern}\` was not found in \`${title}\` or \`${branchName}\``;

      if (failIfIssueNotFound) {
        core.setFailed(`FAILED: ${message}`);
      } else {
        core.info(`${message}`);
      }
      return;
    }
    core.info(`Found issue ID: ${issueId}`);

    const url = `${jiraProjectUrl}/${issueId}`;
    const link = `[${issueId}](${url})`;

    core.info(`Issue URL: ${url}`);

    if (pullRequest.body?.startsWith(link)) {
      core.info(`Pull request body already contains the issue link: ${link}`);
      return;
    }

    // Update the pull request body with the issue link
    core.info(`Updating pull request body with the issue link: ${link}`);
    await octokit.rest.pulls.update({
      ...github.context.repo,
      pull_number: pullRequest.number,
      body: `${link}\n---\n${pullRequest.body ?? ''}`
    });

    core.setOutput('jira-issue-id', issueId);
    core.setOutput('jira-issue-url', url);
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) {
      core.setFailed(error.message);
    }
  }
}
