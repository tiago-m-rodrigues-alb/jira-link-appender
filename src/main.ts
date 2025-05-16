import * as core from '@actions/core'
import * as github from '@actions/github'
import type { PullRequest } from '@octokit/webhooks-types'
import { extractIssueId } from './extract-issue-id.js'

const DEFAULT_TICKET_REGEX = /^[A-Z,a-z]{2,}-\d{1,}/g

/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const githubToken = core.getInput('GITHUB_TOKEN')
    const octokit = github.getOctokit(githubToken)

    const pr = github.context.payload.pull_request as PullRequest | undefined

    if (pr === null || pr === undefined) {
      core.setFailed('No pull request found.')

      return
    }

    const title = pr.title
    const branchName = pr.head.ref

    core.info(`Title: ${title}`)
    core.info(`Branch name: ${branchName}`)

    const pattern = new RegExp(
      core.getInput('jira-issue-regex') || DEFAULT_TICKET_REGEX
    )
    const jiraProjectUrl = core.getInput('jira-project-url')

    const issueId =
      extractIssueId(title, pattern) || extractIssueId(branchName, pattern)

    if (issueId === null) {
      core.setFailed(
        `FAILED: ${pattern} not found in ${title} or ${branchName}`
      )
      return
    }
    const link = `${jiraProjectUrl}/${issueId}`

    await octokit.rest.pulls.update({
      ...github.context.repo,
      pull_number: pr.number,
      body: `${pr.body} \n\n ----- \nJira link: [${issueId}](${link})`
    })

    core.setOutput('jira-issue-id', issueId)
    core.setOutput('jira-issue-link', link)
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
