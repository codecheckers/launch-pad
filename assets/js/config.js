/**
 * Configuration for CODECHECK Launch Pad
 */

// GitHub repository configurations
const GITHUB_CONFIG = {
    testing: {
        owner: 'codecheckers',
        repo: 'testing-dev-register',
        name: 'Testing Register',
        description: 'For development and testing purposes'
    },
    production: {
        owner: 'codecheckers',
        repo: 'register',
        name: 'Production Register',
        description: 'For live CODECHECK certificates'
    }
};

// Issue configuration - unified type for all works
const ISSUE_CONFIG = {
    name: 'CODECHECK Certificate',
    labels: ['certificate'],
    template: 'codecheck-entry'
};

// Unified issue type (no more separate types)
const ISSUE_TYPES = {
    certificate: {
        name: 'CODECHECK Certificate',
        label: 'certificate',
        template: 'codecheck-entry'
    }
};

// Additional labels (empty for unified approach)
const ADDITIONAL_LABELS = {};

// Issue templates - unified template for all works
const ISSUE_TEMPLATES = {
    'codecheck-entry': `
    
**Work**: [Paper title, DOI, link, venue, etc.]

**Repository and workflow**: code and/or data [URL, DOI, etc.]
`
};

// GitHub API configuration
const GITHUB_API = {
    baseURL: 'https://api.github.com',
    rateLimitWarning: 50, // Warn when requests remaining falls below this
    cacheTimeout: 5 * 60 * 1000 // 5 minutes in milliseconds
};

// Application settings
const APP_CONFIG = {
    refreshInterval: 5 * 60 * 1000, // 5 minutes
    maxIssuesPerPage: 100,
    identifierPattern: /(\d{4}-\d{3})/g, // Pattern to match certificate identifiers (YYYY-NNN format)
    currentYear: new Date().getFullYear(),
    identifierPadding: 3 // Number of digits to pad the identifier with (e.g., 3 = "001", "042")
};