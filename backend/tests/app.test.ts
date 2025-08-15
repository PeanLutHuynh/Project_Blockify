import app from '../src/app';
import request from 'supertest';

describe('Project Blockify Backend', () => {
  it('should export app correctly', () => {
    expect(app).toBeDefined();
    expect(typeof app).toBe('function');
  });

  it('should respond to health check', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('OK');
    expect(response.body.message).toBe('Project Blockify API is running');
  });

  it('should respond to API endpoint', async () => {
    const response = await request(app).get('/api');
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Welcome to Project Blockify API');
    expect(response.body.version).toBe('1.0.0');
  });

  it('should handle 404 errors', async () => {
    const response = await request(app).get('/nonexistent');
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Not Found');
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