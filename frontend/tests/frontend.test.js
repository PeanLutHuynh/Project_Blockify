/**
 * Frontend validation tests for Project Blockify
 * These tests validate that the HTML structure and JavaScript are correct
 */

// Mock DOM for testing
const fs = require('fs');
const path = require('path');

describe('Frontend Validation', () => {
  let htmlContent;
  let jsContent;
  let cssContent;

  beforeAll(() => {
    // Load the actual files
    htmlContent = fs.readFileSync(
      path.join(__dirname, '../public/index.html'),
      'utf8'
    );
    jsContent = fs.readFileSync(
      path.join(__dirname, '../public/js/main.js'),
      'utf8'
    );
    cssContent = fs.readFileSync(
      path.join(__dirname, '../public/css/style.css'),
      'utf8'
    );
  });

  describe('HTML Structure', () => {
    it('should have proper DOCTYPE and HTML structure', () => {
      expect(htmlContent).toContain('<!DOCTYPE html>');
      expect(htmlContent).toContain('<html lang="en">');
      expect(htmlContent).toContain('</html>');
    });

    it('should include Bootstrap 5.3', () => {
      expect(htmlContent).toContain('bootstrap@5.3.2');
    });

    it('should have proper meta tags', () => {
      expect(htmlContent).toContain('<meta charset="UTF-8">');
      expect(htmlContent).toContain('viewport');
    });

    it('should include LEGO branding', () => {
      expect(htmlContent).toContain('Blockify');
      expect(htmlContent).toContain('LEGO');
    });
  });

  describe('JavaScript Functionality', () => {
    it('should define BlockifyApp class', () => {
      expect(jsContent).toContain('class BlockifyApp');
    });

    it('should have cart functionality', () => {
      expect(jsContent).toContain('addToCart');
      expect(jsContent).toContain('loadCart');
      expect(jsContent).toContain('saveCart');
    });

    it('should include API health check', () => {
      expect(jsContent).toContain('checkApiHealth');
      expect(jsContent).toContain('/health');
    });
  });

  describe('CSS Styling', () => {
    it('should define LEGO color variables', () => {
      expect(cssContent).toContain('--lego-red');
      expect(cssContent).toContain('--lego-blue');
      expect(cssContent).toContain('--lego-yellow');
    });

    it('should have responsive design rules', () => {
      expect(cssContent).toContain('@media');
      expect(cssContent).toContain('max-width');
    });

    it('should include animation styles', () => {
      expect(cssContent).toContain('@keyframes');
      expect(cssContent).toContain('transition');
    });
  });
});