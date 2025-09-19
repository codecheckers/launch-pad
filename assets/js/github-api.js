/**
 * GitHub API client for CODECHECK Launch Pad
 */
class GitHubAPI {
    constructor() {
        this.baseURL = GITHUB_API.baseURL;
        this.cache = new Map();
    }

    /**
     * Make a request to the GitHub API
     */
    async makeRequest(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const cacheKey = `${url}:${JSON.stringify(options)}`;

        // Check cache first
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < GITHUB_API.cacheTimeout) {
            console.log(`Cache hit for ${endpoint}`);
            return cached.data;
        }

        try {
            console.log(`Making request to: ${endpoint}`);

            const response = await fetch(url, {
                headers: {
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'CODECHECK-Register-Starter/1.0',
                    ...options.headers
                },
                ...options
            });

            if (!response.ok) {
                throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            // Cache the response
            this.cache.set(cacheKey, {
                data: data,
                timestamp: Date.now()
            });

            // Log rate limit info
            const remaining = response.headers.get('X-RateLimit-Remaining');
            const limit = response.headers.get('X-RateLimit-Limit');
            console.log(`Rate limit: ${remaining}/${limit} remaining`);

            if (remaining && parseInt(remaining) < GITHUB_API.rateLimitWarning) {
                console.warn(`GitHub API rate limit warning: ${remaining} requests remaining`);
            }

            return data;
        } catch (error) {
            console.error(`GitHub API request failed for ${endpoint}:`, error);
            throw error;
        }
    }

    /**
     * Get all issues from a repository
     */
    async getRepositoryIssues(owner, repo) {
        const issues = [];
        let page = 1;
        let hasMore = true;

        while (hasMore) {
            const endpoint = `/repos/${owner}/${repo}/issues?state=all&per_page=${APP_CONFIG.maxIssuesPerPage}&page=${page}`;
            const pageIssues = await this.makeRequest(endpoint);

            if (pageIssues.length === 0) {
                hasMore = false;
            } else {
                issues.push(...pageIssues);
                page++;

                // Prevent infinite loops
                if (page > 50) {
                    console.warn('Reached maximum page limit, stopping pagination');
                    hasMore = false;
                }
            }
        }

        console.log(`Fetched ${issues.length} total issues from ${owner}/${repo}`);
        return issues;
    }

    /**
     * Extract certificate identifiers from issue titles
     * Only processes issues with the "id assigned" label
     */
    extractIdentifiers(issues) {
        const identifiers = [];

        // Filter issues to only those with "id assigned" label
        const assignedIssues = issues.filter(issue => {
            return issue.labels && issue.labels.some(label =>
                label.name && label.name.toLowerCase() === 'id assigned'
            );
        });

        console.log(`Processing ${assignedIssues.length} issues with "id assigned" label out of ${issues.length} total issues`);

        if (assignedIssues.length > 0) {
            console.log('Issues with "id assigned" label:');
            assignedIssues.forEach(issue => {
                console.log(`  - Issue #${issue.number}: "${issue.title}"`);
            });
        }

        assignedIssues.forEach(issue => {
            if (issue.title) {
                // Look for range patterns first (e.g., "2025-020/2025-031")
                // Match exactly YYYY-XXX/YYYY-XXX format (4 digits year, 3 digits number)
                const rangePattern = /(\d{4}-\d{3})\/(\d{4}-\d{3})/g;
                const rangeMatches = [...issue.title.matchAll(rangePattern)];

                rangeMatches.forEach(match => {
                    const startId = match[1];
                    const endId = match[2];

                    const [startYear, startNumberStr] = startId.split('-');
                    const [endYear, endNumberStr] = endId.split('-');

                    const startNumber = parseInt(startNumberStr);
                    const endNumber = parseInt(endNumberStr);

                    console.log(`Found range in "${issue.title}": ${startId} to ${endId} (${endNumber - startNumber + 1} identifiers)`);

                    // Only process ranges within the same year
                    if (parseInt(startYear) === parseInt(endYear)) {
                        // Add all identifiers in the range
                        for (let num = startNumber; num <= endNumber; num++) {
                            const paddedNumber = num.toString().padStart(startNumberStr.length, '0');
                            const fullId = `${startYear}-${paddedNumber}`;

                            identifiers.push({
                                full: fullId,
                                year: parseInt(startYear),
                                number: num,
                                issueTitle: issue.title,
                                issueNumber: issue.number,
                                issueUrl: issue.html_url,
                                isFromRange: true,
                                rangeStart: startId,
                                rangeEnd: endId
                            });
                        }
                    } else {
                        console.warn(`Skipping cross-year range: ${startId} to ${endId}`);
                    }
                });

                // Then look for individual identifier patterns:
                // Match exactly YYYY-XXX format (4 digits year, 3 digits number)
                // Examples: "2024-001", "2025-042", "[Author Name] | 2024-001"
                const identifierPattern = /(\d{4}-\d{3})/g;

                const matches = [...issue.title.matchAll(identifierPattern)];
                matches.forEach(match => {
                    const fullId = match[1];

                    // Skip if this identifier is already part of a range we processed
                    const isPartOfRange = rangeMatches.some(rangeMatch => {
                        const startId = rangeMatch[1];
                        const endId = rangeMatch[2];
                        const [startYear, startNumberStr] = startId.split('-');
                        const [endYear, endNumberStr] = endId.split('-');
                        const startNumber = parseInt(startNumberStr);
                        const endNumber = parseInt(endNumberStr);
                        const [year, numberStr] = fullId.split('-');
                        const number = parseInt(numberStr);

                        return parseInt(year) === parseInt(startYear) &&
                               number >= startNumber &&
                               number <= endNumber;
                    });

                    if (!isPartOfRange) {
                        const [year, numberStr] = fullId.split('-');
                        const number = parseInt(numberStr);

                        identifiers.push({
                            full: fullId,
                            year: parseInt(year),
                            number: number,
                            issueTitle: issue.title,
                            issueNumber: issue.number,
                            issueUrl: issue.html_url,
                            isFromRange: false
                        });
                    }
                });
            }
        });

        // Remove duplicates and sort by year and number
        const uniqueIdentifiers = identifiers.filter((id, index, arr) =>
            arr.findIndex(other => other.full === id.full) === index
        );

        uniqueIdentifiers.sort((a, b) => {
            if (a.year !== b.year) {
                return a.year - b.year;
            }
            return a.number - b.number;
        });

        console.log(`Found ${uniqueIdentifiers.length} certificate identifiers (including ranges)`);

        // Debug: Log all identifiers for verification
        if (uniqueIdentifiers.length > 0) {
            const currentYearIds = uniqueIdentifiers.filter(id => id.year === 2025).map(id => id.full);
            console.log(`2025 identifiers found: ${currentYearIds.join(', ')}`);

            // Show range-derived identifiers specifically
            const rangeIds = uniqueIdentifiers.filter(id => id.isFromRange && id.year === 2025);
            if (rangeIds.length > 0) {
                console.log(`Range-derived 2025 identifiers: ${rangeIds.map(id => id.full).join(', ')}`);
            }
        }

        return uniqueIdentifiers;
    }

    /**
     * Calculate the next available identifier
     */
    calculateNextIdentifier(identifiers) {
        const currentYear = APP_CONFIG.currentYear;
        const currentYearIdentifiers = identifiers.filter(id => id.year === currentYear);
        const currentYearNumbers = currentYearIdentifiers
            .map(id => id.number)
            .sort((a, b) => a - b); // Sort numbers for gap detection

        // Get minimum starting number based on repository
        const repoConfig = window.app?.ui?.getCurrentRepository() || 'testing';
        let minNumber = 1;

        // Production register should start from 028 for 2025
        if (repoConfig === 'production' && currentYear === 2025) {
            minNumber = 28;
        }

        let nextNumber = minNumber;
        let highestIdentifier = null;

        if (currentYearNumbers.length > 0) {
            // Find the identifier with the highest number
            const maxNumber = Math.max(...currentYearNumbers);
            highestIdentifier = currentYearIdentifiers.find(id => id.number === maxNumber);

            console.log(`Current year numbers: ${currentYearNumbers.join(', ')}`);
            console.log(`Max number found: ${maxNumber}`);

            // Always use the next number after the highest assigned identifier
            // This ensures sequential assignment rather than filling gaps
            nextNumber = Math.max(minNumber, maxNumber + 1);

            console.log(`Next number calculated: ${nextNumber}`);
        }

        const nextId = this.formatIdentifier(nextNumber);

        console.log(`Next available identifier: ${nextId} (min: ${minNumber})`);
        if (highestIdentifier) {
            console.log(`Highest current identifier: ${highestIdentifier.full} from issue #${highestIdentifier.issueNumber}`);
        }

        return {
            identifier: nextId,
            year: currentYear,
            number: nextNumber,
            isFirstOfYear: nextNumber === minNumber,
            highestIdentifier: highestIdentifier
        };
    }

    /**
     * Format certificate identifier using the YYYY-NNN format
     */
    formatIdentifier(number) {
        const currentYear = APP_CONFIG.currentYear;
        const paddedNumber = number.toString().padStart(APP_CONFIG.identifierPadding, '0');
        return `${currentYear}-${paddedNumber}`;
    }

    /**
     * Generate GitHub issue creation URL
     */
    generateIssueURL(owner, repo, title, body, labels, assignees = []) {
        const baseUrl = `https://github.com/${owner}/${repo}/issues/new`;
        const params = new URLSearchParams();

        params.set('title', title);
        params.set('body', body);

        if (labels && labels.length > 0) {
            params.set('labels', labels.join(','));
        }

        if (assignees && assignees.length > 0) {
            // GitHub supports multiple assignees as comma-separated values
            params.set('assignees', assignees.join(','));
        }

        return `${baseUrl}?${params.toString()}`;
    }

    /**
     * Generate issue title based on type and identifier
     */
    generateIssueTitle(type, identifier, authorNames = '') {
        const typeConfig = ISSUE_TYPES[type];
        if (!typeConfig) {
            throw new Error(`Invalid certificate type: ${type}`);
        }

        if (authorNames.trim()) {
            return `${authorNames.trim()} | ${identifier}`;
        } else {
            return `[Author Names] | ${identifier}`;
        }
    }

    /**
     * Generate issue body from template
     */
    generateIssueBody(type, identifier) {
        const typeConfig = ISSUE_TYPES[type];
        if (!typeConfig) {
            throw new Error(`Invalid certificate type: ${type}`);
        }

        const template = ISSUE_TEMPLATES[typeConfig.template];
        if (!template) {
            throw new Error(`No template found for certificate type: ${type}`);
        }

        return template.replace('{identifier}', identifier);
    }

    /**
     * Get labels for a certificate type (legacy method)
     */
    getLabelsForType(type) {
        const typeConfig = ISSUE_TYPES[type];
        if (!typeConfig) {
            throw new Error(`Invalid certificate type: ${type}`);
        }

        const labels = [typeConfig.label];
        const additional = ADDITIONAL_LABELS[type] || [];

        return labels.concat(additional);
    }

    /**
     * Get all available labels from a repository
     */
    async getRepositoryLabels(owner, repo) {
        const endpoint = `/repos/${owner}/${repo}/labels?per_page=100`;

        try {
            const labels = await this.makeRequest(endpoint);
            console.log(`Fetched ${labels.length} labels from ${owner}/${repo}`);
            return labels.map(label => ({
                name: label.name,
                color: label.color,
                description: label.description || '',
                url: label.url
            }));
        } catch (error) {
            console.error('Failed to fetch repository labels:', error);
            throw error;
        }
    }

    /**
     * Generate GitHub search URL for all non-development issues
     */
    generateAllChecksSearchUrl(owner, repo) {
        const searchQuery = `repo:${owner}/${repo} -label:development`;
        return `https://github.com/search?q=${encodeURIComponent(searchQuery)}&type=issues`;
    }

    /**
     * Generate GitHub search URL for ongoing checks (open non-development issues)
     */
    generateOngoingChecksSearchUrl(owner, repo) {
        const searchQuery = `repo:${owner}/${repo} is:open -label:development`;
        return `https://github.com/search?q=${encodeURIComponent(searchQuery)}&type=issues`;
    }

    /**
     * Generate GitHub search URL for completed checks with specific label
     */
    generateCompletedCategorySearchUrl(owner, repo, labelName) {
        let searchQuery;

        if (labelName === 'conference/workshop') {
            // Special case for conference/workshop - search for either label
            searchQuery = `repo:${owner}/${repo} is:closed -label:development (label:conference OR label:workshop)`;
        } else {
            // Standard label search
            searchQuery = `repo:${owner}/${repo} is:closed -label:development label:"${labelName}"`;
        }

        return `https://github.com/search?q=${encodeURIComponent(searchQuery)}&type=issues`;
    }


    /**
     * Clear the API cache
     */
    clearCache() {
        this.cache.clear();
        console.log('GitHub API cache cleared');
    }
}