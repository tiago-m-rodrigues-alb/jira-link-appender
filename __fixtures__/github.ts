import { jest } from '@jest/globals';

export const context = {
  payload: {
    pull_request: {
      title: 'ABC-123: Add new feature',
      head: { ref: 'feature/ABC-123-new-feature' },
      number: 42,
      body: ''
    }
  },
  repo: { owner: 'test', repo: 'repo' }
};

// Create a single mock function instance for update
export const updateMock = jest.fn(() => Promise.resolve({}));

export const getOctokit = jest.fn(() => ({
  rest: {
    pulls: {
      update: updateMock
    }
  }
}));
