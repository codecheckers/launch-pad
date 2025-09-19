/**
 * Main application logic for CODECHECK Launch Pad
 */
class LaunchPadApp {
    constructor() {
        this.githubAPI = new GitHubAPI();
        this.ui = new LaunchPadUI();
        this.isLoading = false;
    }

    /**
     * Initialize the application
     */
    async init() {
        console.log('Initializing CODECHECK Launch Pad...');

        // Initialize UI
        this.ui.init();
        this.ui.setupEventListeners();

        console.log('Application initialized successfully');
    }

    /**
     * Load the next available identifier for the selected repository
     */
    async loadNextIdentifier() {
        if (this.isLoading) {
            console.log('Already loading, skipping...');
            return;
        }

        this.isLoading = true;
        const repository = this.ui.getCurrentRepository();
        const repoConfig = GITHUB_CONFIG[repository];

        this.ui.showLoading(`Analyzing ${repoConfig.name}...`);

        try {
            console.log(`Loading identifier for repository: ${repoConfig.owner}/${repoConfig.repo}`);

            // Fetch all issues from the repository
            const issues = await this.githubAPI.getRepositoryIssues(repoConfig.owner, repoConfig.repo);

            // Extract certificate identifiers
            const identifiers = this.githubAPI.extractIdentifiers(issues);

            // Calculate next available identifier
            const nextIdentifier = this.githubAPI.calculateNextIdentifier(identifiers);

            // Calculate statistics
            const stats = this.calculateStatistics(issues, identifiers);

            console.log('Successfully loaded next identifier:', nextIdentifier);
            this.ui.showResults(nextIdentifier, stats);

        } catch (error) {
            console.error('Failed to load next identifier:', error);
            this.ui.showError(`Failed to analyze ${repoConfig.name}. Please check your connection and try again.`);
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Calculate statistics for the repository
     */
    calculateStatistics(issues, identifiers) {
        console.log('Calculating statistics for:', issues.length, 'issues and', identifiers.length, 'identifiers');

        try {
            // Filter out development issues
            const nonDevelopmentIssues = issues.filter(issue =>
                !issue.labels.some(label => label.name.toLowerCase() === 'development')
            );

            console.log('Non-development issues:', nonDevelopmentIssues.length);

            // Number of checks (all non-development issues)
            const numberOfChecks = nonDevelopmentIssues.length;

            // Number of ongoing checks (open non-development issues)
            const ongoingChecks = nonDevelopmentIssues.filter(issue => issue.state === 'open').length;

            // Completed checks by category (closed non-development issues with specific labels)
            const completedIssues = nonDevelopmentIssues.filter(issue => issue.state === 'closed');

            console.log('Completed issues:', completedIssues.length);

            const completedByCategory = {
                institution: this.countIssuesWithLabel(completedIssues, 'institution'),
                journal: this.countIssuesWithLabel(completedIssues, 'journal'),
                community: this.countIssuesWithLabel(completedIssues, 'community'),
                conferenceWorkshop: this.countIssuesWithLabel(completedIssues, ['conference', 'workshop']),
                needsCodechecker: this.countIssuesWithLabel(completedIssues, 'needs codechecker')
            };

            const result = {
                numberOfChecks,
                ongoingChecks,
                completedByCategory,
                lastAnalyzed: new Date()
            };

            console.log('Statistics calculated:', result);
            return result;

        } catch (error) {
            console.error('Error calculating statistics:', error);
            // Return safe default values
            return {
                numberOfChecks: 0,
                ongoingChecks: 0,
                completedByCategory: {
                    institution: 0,
                    journal: 0,
                    community: 0,
                    conferenceWorkshop: 0,
                    needsCodechecker: 0
                },
                lastAnalyzed: new Date()
            };
        }
    }

    /**
     * Count issues that have a specific label or any of multiple labels
     */
    countIssuesWithLabel(issues, labelNames) {
        try {
            if (!issues || !Array.isArray(issues)) {
                console.warn('Issues is not an array:', issues);
                return 0;
            }

            const labels = Array.isArray(labelNames) ? labelNames : [labelNames];

            const count = issues.filter(issue => {
                if (!issue.labels || !Array.isArray(issue.labels)) {
                    return false;
                }

                return issue.labels.some(label => {
                    if (!label || !label.name) {
                        return false;
                    }

                    return labels.some(targetLabel =>
                        label.name.toLowerCase().includes(targetLabel.toLowerCase())
                    );
                });
            }).length;

            console.log(`Count for labels [${labels.join(', ')}]:`, count);
            return count;

        } catch (error) {
            console.error('Error counting issues with label:', error);
            return 0;
        }
    }

    /**
     * Refresh data (clear cache and reload)
     */
    async refresh() {
        console.log('Refreshing data...');
        this.githubAPI.clearCache();
        await this.loadNextIdentifier();
    }
}

// Global app instance
let app;

// Initialize the application when DOM is ready
$(document).ready(function() {
    console.log('DOM ready, initializing application...');

    // Initialize Bootstrap tooltips
    $('[data-bs-toggle="tooltip"]').tooltip();

    // Create and initialize the app
    app = new LaunchPadApp();
    app.init().catch(error => {
        console.error('Failed to initialize application:', error);
    });

    // Make app globally available for debugging
    window.app = app;
});