import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// クリーンアップを自動実行
afterEach(() => {
  cleanup();
});
