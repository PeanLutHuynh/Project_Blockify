import { createApp } from '../src/app';

describe('Project Blockify Backend', () => {
  it('should start without errors', () => {
    expect(() => {
      const app = createApp();
      expect(app).toBeDefined();
    }).not.toThrow();
  });

  it('should export app correctly', () => {
    const app = require('../src/app').default;
    expect(app).toBeDefined();
    expect(typeof app).toBe('function');
  });
});

// Basic math test to ensure Jest is working
describe('Basic Tests', () => {
  it('should perform basic math', () => {
    expect(2 + 2).toBe(4);
    expect(10 - 5).toBe(5);
  });

  it('should handle arrays', () => {
    const arr = [1, 2, 3];
    expect(arr.length).toBe(3);
    expect(arr[0]).toBe(1);
  });
});