/**
 * Unit tests for the action's main functionality, src/main.ts
 *
 * To mock dependencies in ESM, you can create fixtures that export mock
 * functions and objects. For example, the core module is mocked in this test,
 * so that the actual '@actions/core' module is not imported.
 */
import { jest } from '@jest/globals';
import * as core from '../__fixtures__/core.js';
import * as github from '../__fixtures__/github.js';
import { extractIssueId } from '../src/extract-issue-id.js';

// Mocks should be declared before the module being tested is imported.
jest.unstable_mockModule('@actions/core', () => core);
jest.unstable_mockModule('@actions/github', () => github);
jest.unstable_mockModule('../src/extract-issue-id.js', () => ({
  extractIssueId
}));

// The module being tested should be imported dynamically. This ensures that the
// mocks are used in place of any actual dependencies.
const { run } = await import('../src/main.js');

describe('main.ts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock inputs
    core.getInput.mockImplementation((name) => {
      switch (name) {
        case 'GITHUB_TOKEN':
          return 'token';
        case 'jira-project-url':
          return 'https://jira.example.com/browse';
        case 'jira-issue-regex':
          return '';
        case 'fail-if-issue-not-found':
          return 'false';
        default:
          return '';
      }
    });
    github.context.payload.pull_request = {
      title: 'ABC-123: Add new feature',
      head: { ref: 'feature/ABC-123-new-feature' },
      number: 42,
      body: ''
    };
  });

  it('updates PR body and sets outputs when issue is found', async () => {
    await run();
    expect(core.info).toHaveBeenCalledWith('Found issue ID: ABC-123');
    expect(core.setOutput).toHaveBeenCalledWith('jira-issue-id', 'ABC-123');
    expect(core.setOutput).toHaveBeenCalledWith(
      'jira-issue-url',
      'https://jira.example.com/browse/ABC-123'
    );
    expect(github.getOctokit().rest.pulls.update).toHaveBeenCalledWith(
      expect.objectContaining({
        pull_number: 42,
        body: '[ABC-123](https://jira.example.com/browse/ABC-123)\n---\n'
      })
    );
  });

  it('does not update PR body if link already present', async () => {
    github.context.payload.pull_request.body =
      '[ABC-123](https://jira.example.com/browse/ABC-123)\n---\nSome description';

    await run();

    expect(core.info).toHaveBeenCalledWith(
      'Pull request body already contains the issue link: [ABC-123](https://jira.example.com/browse/ABC-123)'
    );
    expect(github.getOctokit().rest.pulls.update).not.toHaveBeenCalled();
  });

  it('sets failed if no issue is found and fail-if-issue-not-found is true', async () => {
    core.getInput.mockImplementation((name) => {
      if (name === 'fail-if-issue-not-found') return 'true';
      if (name === 'jira-project-url') return 'https://jira.example.com/browse';
      return '';
    });
    github.context.payload.pull_request.title = 'No issue here';
    github.context.payload.pull_request.head.ref = 'no-issue-branch';
    await run();
    expect(core.setFailed).toHaveBeenCalledWith(
      expect.stringContaining('was not found')
    );
  });

  it('logs info if no issue is found and fail-if-issue-not-found is false', async () => {
    core.getInput.mockImplementation((name) => {
      if (name === 'fail-if-issue-not-found') return 'false';
      if (name === 'jira-project-url') return 'https://jira.example.com/browse';
      return '';
    });
    github.context.payload.pull_request.title = 'No issue here';
    github.context.payload.pull_request.head.ref = 'no-issue-branch';
    await run();
    expect(core.info).toHaveBeenCalledWith(
      expect.stringContaining('was not found')
    );
    expect(core.setFailed).not.toHaveBeenCalled();
  });
});
