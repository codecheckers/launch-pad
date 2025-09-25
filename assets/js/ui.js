/**
 * UI management for CODECHECK Launch Pad
 */
class LaunchPadUI {
    constructor() {
        this.elements = {};
        this.currentRepository = 'production'; // Updated default to production
        this.currentIdentifier = null;
        this.currentStats = null;
        this.availableLabels = [];
        this.selectedLabels = ['certificate', 'needs codechecker']; // Default labels
        this.authorNames = '';
        this.selectedCodecheckers = []; // Array to store multiple codecheckers
        this.codecheckerManager = new CodecheckerManager();
        this.searchTimeout = null;
        this.defaultDescriptionTemplate = ISSUE_TEMPLATES['codecheck-entry'].trim();
        this.highlightedCodecheckerIndex = -1; // For keyboard navigation
        this.titleManuallyEdited = false; // Track if user manually edited the title
    }

    /**
     * Initialize UI elements and cache selectors
     */
    init() {
        console.log('Initializing UI...');

        // Cache DOM elements
        this.elements = {
            // Buttons
            getNextIdentifierBtn: $('#get-next-identifier-btn'),
            createIssueBtn: $('#create-issue-btn'),

            // Repository selection
            repositoryRadios: $('input[name="repository"]'),
            testingRepo: $('#testing-repo'),
            productionRepo: $('#production-repo'),
            repositorySelection: $('#repository-selection'),
            currentRepositoryIndicator: $('#current-repository-indicator'),


            // Loading and error states
            loading: $('#loading'),
            loadingMessage: $('#loading-message'),
            error: $('#error'),
            errorMessage: $('#error-message'),

            // Results
            resultsContainer: $('#results-container'),
            nextIdentifierDisplay: $('#next-identifier-display'),
            highestIdentifierLink: $('#highest-identifier-link'),
            highestIdentifierIssueLink: $('#highest-identifier-issue-link'),
            identifierWarnings: $('#identifier-warnings'),
            warningList: $('#warning-list'),
            authorNames: $('#author-names'),
            issueDescription: $('#issue-description'),
            issueTitlePreview: $('#issue-title-preview'),

            // Labels
            labelsLoading: $('#labels-loading'),
            labelsError: $('#labels-error'),
            availableLabels: $('#available-labels'),

            // Statistics
            statsContainer: $('#stats-container'),
            numberOfChecks: $('#number-of-checks'),
            ongoingChecks: $('#ongoing-checks'),
            lastUpdated: $('#last-updated'),

            // Statistics links
            numberOfChecksLink: $('#number-of-checks-link'),
            ongoingChecksLink: $('#ongoing-checks-link'),

            // Category counts
            institutionCount: $('#institution-count'),
            journalCount: $('#journal-count'),
            communityCount: $('#community-count'),
            conferenceWorkshopCount: $('#conference-workshop-count'),
            needsCodecheckerCount: $('#needs-codechecker-count'),

            // Category links
            institutionLink: $('#institution-link'),
            journalLink: $('#journal-link'),
            communityLink: $('#community-link'),
            conferenceWorkshopLink: $('#conference-workshop-link'),
            needsCodecheckerLink: $('#needs-codechecker-link'),

            // Codechecker selection
            codecheckerSearch: $('#codechecker-search'),
            codecheckerLoading: $('#codechecker-loading'),
            codecheckerDropdown: $('#codechecker-dropdown'),
            codecheckerCount: $('#codecheckers-count'),
            selectedCodecheckers: $('#selected-codecheckers'),

            // Modal
            createIssueModal: $('#createIssueModal'),
            modalRepository: $('#modal-repository'),
            modalIdentifier: $('#modal-identifier'),
            modalTitlePreview: $('#modal-title-preview'),
            modalLabels: $('#modal-labels'),
            modalCodecheckers: $('#modal-codecheckers'),
            modalBodyPreview: $('#modal-body-preview'),
            githubCreateLink: $('#github-create-link')
        };

        // Set initial repository indicator
        this.updateRepositoryIndicator();

        console.log('UI initialized successfully');
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        console.log('Setting up event listeners...');

        // Repository selection
        this.elements.repositoryRadios.on('change', (e) => {
            this.currentRepository = e.target.value;
            this.resetResults();
            this.loadRepositoryLabels();
            this.updateRepositoryIndicator();
            console.log(`Repository changed to: ${this.currentRepository}`);
        });

        // Repository selection collapse/expand
        this.elements.repositorySelection.on('show.bs.collapse', () => {
            this.elements.currentRepositoryIndicator.hide();
        });

        this.elements.repositorySelection.on('hide.bs.collapse', () => {
            this.elements.currentRepositoryIndicator.show();
        });


        // Get next identifier button
        this.elements.getNextIdentifierBtn.on('click', () => {
            this.onGetNextIdentifier();
        });

        // Create issue button
        this.elements.createIssueBtn.on('click', () => {
            this.onCreateIssue();
        });

        // Author names input
        this.elements.authorNames.on('input', () => {
            this.authorNames = this.elements.authorNames.val().trim();
            this.updateIssuePreview();
        });

        // Issue title input - track manual edits
        this.elements.issueTitlePreview.on('input', () => {
            this.titleManuallyEdited = true;
        });

        this.elements.issueTitlePreview.on('focus', () => {
            // When user focuses on title, mark as manually edited
            this.titleManuallyEdited = true;
        });

        // Issue description input - handle template behavior
        this.elements.issueDescription.on('focus', () => {
            this.handleDescriptionFocus();
        });

        this.elements.issueDescription.on('blur', () => {
            this.handleDescriptionBlur();
        });

        // Codechecker search
        this.elements.codecheckerSearch.on('input', (e) => {
            this.onCodecheckerSearch(e.target.value);
        });

        this.elements.codecheckerSearch.on('focus', () => {
            this.loadCodecheckersIfNeeded();
        });

        // Keyboard navigation for codechecker dropdown
        this.elements.codecheckerSearch.on('keydown', (e) => {
            this.handleCodecheckerKeydown(e);
        });

        // Clear all codecheckers
        $(document).on('click', '.remove-codechecker', (e) => {
            const handle = $(e.currentTarget).data('handle');
            this.removeCodechecker(handle);
        });

        // Hide dropdown when clicking outside
        $(document).on('click', (e) => {
            if (!$(e.target).closest('#codechecker-search, #codechecker-dropdown').length) {
                this.elements.codecheckerDropdown.hide();
                this.highlightedCodecheckerIndex = -1;
            }
        });

        console.log('Event listeners set up successfully');
    }

    /**
     * Handle get next identifier button click
     */
    onGetNextIdentifier() {
        if (window.app) {
            window.app.loadNextIdentifier();
        }
    }

    /**
     * Handle create issue button click
     */
    onCreateIssue() {
        if (!this.currentIdentifier) {
            this.showError('No identifier available. Please get the next identifier first.');
            return;
        }

        this.showCreateIssueModal();
    }

    /**
     * Show loading state
     */
    showLoading(message = 'Analyzing register...') {
        this.elements.loading.show();
        this.elements.loadingMessage.text(message);
        this.elements.error.hide();
        this.elements.resultsContainer.hide();
        this.elements.getNextIdentifierBtn.prop('disabled', true);
    }

    /**
     * Hide loading state
     */
    hideLoading() {
        this.elements.loading.hide();
        this.elements.getNextIdentifierBtn.prop('disabled', false);
    }

    /**
     * Show error message
     */
    showError(message) {
        this.elements.error.show();
        this.elements.errorMessage.text(message);
        this.elements.loading.hide();
        this.elements.resultsContainer.hide();
        this.elements.getNextIdentifierBtn.prop('disabled', false);
    }

    /**
     * Hide error message
     */
    hideError() {
        this.elements.error.hide();
    }

    /**
     * Display the next identifier and enable create button
     */
    showResults(identifierData, stats, identifierWarnings = []) {
        this.currentIdentifier = identifierData;
        this.currentStats = stats;

        this.elements.nextIdentifierDisplay.text(identifierData.identifier);

        // Show link to highest identifier issue if available
        if (identifierData.highestIdentifier) {
            const highest = identifierData.highestIdentifier;
            this.elements.highestIdentifierIssueLink.attr('href', highest.issueUrl);
            this.elements.highestIdentifierIssueLink.text(`${highest.full} in issue #${highest.issueNumber}`);
            this.elements.highestIdentifierLink.show();
        } else {
            this.elements.highestIdentifierLink.hide();
        }

        // Display identifier warnings if any
        this.displayIdentifierWarnings(identifierWarnings);

        // Auto-select "id assigned" label when identifier is retrieved
        if (!this.selectedLabels.includes('id assigned')) {
            this.selectedLabels.push('id assigned');
        }

        this.updateIssuePreview();
        this.updateStatistics(stats);

        // Load labels if not already loaded
        if (this.availableLabels.length === 0) {
            this.loadRepositoryLabels();
        } else {
            // If labels are already loaded, update the display to show the new selection
            this.displayAvailableLabels();
        }

        this.elements.resultsContainer.show();
        this.elements.statsContainer.show();
        this.elements.createIssueBtn.prop('disabled', false);

        this.hideLoading();
        this.hideError();
    }

    /**
     * Display identifier warnings for recent issues
     */
    displayIdentifierWarnings(warnings) {
        if (!warnings || warnings.length === 0) {
            this.elements.identifierWarnings.hide();
            return;
        }

        const warningList = this.elements.warningList;
        warningList.empty();

        warnings.forEach(warning => {
            const identifiersText = warning.identifiers.join(', ');
            const listItem = $(`
                <li class="mb-1">
                    Issue <a href="${warning.url}" target="_blank" class="text-decoration-none">#${warning.number}</a>:
                    "${warning.title}" contains identifier(s) <strong>${identifiersText}</strong>
                </li>
            `);
            warningList.append(listItem);
        });

        this.elements.identifierWarnings.show();
        console.log(`Displayed ${warnings.length} identifier warnings`);
    }

    /**
     * Update issue preview based on current selections
     */
    updateIssuePreview() {
        if (!this.currentIdentifier) return;

        try {
            // Only auto-update the title if user hasn't manually edited it
            if (!this.titleManuallyEdited) {
                const github = window.app.githubAPI;
                const title = github.generateIssueTitle('certificate', this.currentIdentifier.identifier, this.authorNames);
                this.elements.issueTitlePreview.val(title);
            }
        } catch (error) {
            console.error('Error updating issue preview:', error);
        }
    }

    /**
     * Load available labels from the current repository
     */
    async loadRepositoryLabels() {
        if (!window.app) return;

        const repoConfig = GITHUB_CONFIG[this.currentRepository];
        this.elements.labelsLoading.show();
        this.elements.labelsError.hide();

        try {
            this.availableLabels = await window.app.githubAPI.getRepositoryLabels(repoConfig.owner, repoConfig.repo);
            this.displayAvailableLabels();
        } catch (error) {
            console.error('Failed to load repository labels:', error);
            this.elements.labelsError.show();
            this.loadDefaultLabels();
        } finally {
            this.elements.labelsLoading.hide();
        }
    }

    /**
     * Load default labels when repository labels fail to load
     * Using actual GitHub colors from codecheckers/register repository
     */
    loadDefaultLabels() {
        this.availableLabels = [
            { name: 'certificate', color: '008033', description: 'CODECHECK certificate' },
            { name: 'needs codechecker', color: 'd73a4a', description: 'Requires a codechecker assignment' },
            { name: 'institution', color: '5319e7', description: 'Institutional check' },
            { name: 'journal', color: 'f7a5ba', description: 'Journal-based check' },
            { name: 'community', color: 'f9f89d', description: 'Community check' },
            { name: 'conference', color: 'CA1C33', description: 'Conference-related check' },
            { name: 'workshop', color: 'CA1C33', description: 'Workshop-related check' },
            { name: 'id assigned', color: '0e8a16', description: 'Certificate identifier has been assigned' },
            { name: 'enhancement', color: 'a2eeef', description: 'New feature or request' },
            { name: 'documentation', color: '0075ca', description: 'Improvements or additions to documentation' },
            { name: 'bug', color: 'd73a49', description: 'Something isn\'t working' }
        ];
        this.displayAvailableLabels();
    }

    /**
     * Display available labels with interactive selection
     */
    displayAvailableLabels() {
        this.elements.availableLabels.empty();

        this.availableLabels.forEach(label => {
            const isSelected = this.selectedLabels.includes(label.name);
            const isNeedsCodechecker = label.name === 'needs codechecker';
            const isAutoManaged = isNeedsCodechecker && this.selectedCodecheckers.length > 0;

            const labelElement = $(`
                <button type="button" class="label-badge label-selectable ${isSelected ? 'selected' : ''} ${isAutoManaged ? 'label-auto-managed' : ''}"
                        data-label="${label.name}"
                        title="${isAutoManaged ? 'Automatically managed based on codechecker assignment' : (label.description || label.name)}"
                        style="background-color: #${label.color}; color: ${this.getContrastColor(label.color)};"
                        ${isAutoManaged ? 'disabled' : ''}>
                    ${label.name} ${isSelected ? '✓' : ''}${isAutoManaged ? ' (auto)' : ''}
                </button>
            `);

            labelElement.on('click', () => {
                if (!isAutoManaged) {
                    this.toggleLabel(label.name);
                }
            });
            this.elements.availableLabels.append(labelElement);
        });
    }

    /**
     * Toggle label selection
     */
    toggleLabel(labelName) {
        const index = this.selectedLabels.indexOf(labelName);

        if (index > -1) {
            // Don't allow removing essential labels
            if (labelName !== 'certificate' && labelName !== 'id assigned') {
                this.selectedLabels.splice(index, 1);
            }
        } else {
            this.selectedLabels.push(labelName);
        }

        this.displayAvailableLabels();
        this.updateIssuePreview();
    }

    /**
     * Get contrast color (black or white) for a given background color
     */
    getContrastColor(hexColor) {
        // Convert hex to RGB
        const r = parseInt(hexColor.substr(0, 2), 16);
        const g = parseInt(hexColor.substr(2, 2), 16);
        const b = parseInt(hexColor.substr(4, 2), 16);

        // Calculate luminance
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

        return luminance > 0.5 ? '#000000' : '#ffffff';
    }

    /**
     * Display selected labels in the modal preview
     */
    displaySelectedLabels(container) {
        container.empty();

        if (this.selectedLabels.length === 0) {
            container.append('<span class="text-muted">No labels selected</span>');
            return;
        }

        this.selectedLabels.forEach(labelName => {
            const label = this.availableLabels.find(l => l.name === labelName) ||
                         { name: labelName, color: '6c757d', description: '' };

            const labelElement = $(`
                <span class="label-badge"
                      style="background-color: #${label.color}; color: ${this.getContrastColor(label.color)};">
                    ${label.name}
                </span>
            `);

            container.append(labelElement);
        });
    }

    /**
     * Format ORCID iD according to official guidelines
     * @param {string} orcid - The ORCID identifier
     * @param {boolean} includeIcon - Whether to include the ORCID icon (default: true)
     * @param {boolean} makeClickable - Whether to make the ORCID URL clickable (default: true)
     */
    formatOrcidDisplay(orcid, includeIcon = true, makeClickable = true) {
        if (!orcid) return '';

        const orcidUrl = `https://orcid.org/${orcid}`;

        if (!includeIcon) {
            // Simple version without icon for compact displays like search results
            if (makeClickable) {
                return `<a href="${orcidUrl}" target="_blank" rel="noopener" class="text-decoration-none text-info">https://orcid.org/${orcid}</a>`;
            } else {
                // Non-clickable version for search results to preserve item clickability
                return `<span class="text-info">https://orcid.org/${orcid}</span>`;
            }
        }

        // Official ORCID iD icon (green version) for modal display
        const orcidIcon = `<svg width="16" height="16" viewBox="0 0 256 256" style="background:white;" xmlns="http://www.w3.org/2000/svg">
            <path fill="#A6CE39" d="M256,128c0,70.7-57.3,128-128,128C57.3,256,0,198.7,0,128C0,57.3,57.3,0,128,0C198.7,0,256,57.3,256,128z"/>
            <g>
                <path fill="#fff" d="M86.3,186.2H70.9V79.1h15.4v48.4V186.2z"/>
                <path fill="#fff" d="M108.9,79.1h41.6c39.6,0,57,28.3,57,53.6c0,27.5-21.5,53.6-56.8,53.6h-41.8V79.1z M124.3,172.4h24.5c21.9,0,41.8-11.7,41.8-39.8c0-26.9-17.3-39.8-41.8-39.8h-24.5V172.4z"/>
                <circle fill="#fff" cx="78.2" cy="41.7" r="11.9"/>
            </g>
        </svg>`;

        if (makeClickable) {
            return `${orcidIcon} <a href="${orcidUrl}" target="_blank" rel="noopener" class="text-decoration-none text-info">https://orcid.org/${orcid}</a>`;
        } else {
            return `${orcidIcon} <span class="text-info">https://orcid.org/${orcid}</span>`;
        }
    }

    /**
     * Display selected codecheckers in the modal preview
     */
    displaySelectedCodecheckers(container) {
        container.empty();

        if (this.selectedCodecheckers.length === 0) {
            container.append('<span class="text-muted">No codecheckers assigned</span>');
            return;
        }

        this.selectedCodecheckers.forEach(codechecker => {
            const orcidDisplay = codechecker.orcid ? this.formatOrcidDisplay(codechecker.orcid) : '';

            const codecheckerElement = $(`
                <div class="d-flex align-items-center mb-2">
                    <div class="me-3">
                        <strong>${codechecker.name || codechecker.handle}</strong>
                        <div class="text-muted small">@${codechecker.handle}</div>
                        ${orcidDisplay ? `<div class="text-info small">${orcidDisplay}</div>` : ''}
                    </div>
                    ${codechecker.allSkills && codechecker.allSkills.length > 0 ?
                        `<div class="text-secondary small"><strong>Skills:</strong> ${codechecker.allSkills.join(', ')}</div>` : ''
                    }
                </div>
            `);

            container.append(codecheckerElement);
        });
    }

    /**
     * Update statistics display
     */
    updateStatistics(stats) {
        console.log('Updating statistics with:', stats);

        try {
            const repoConfig = GITHUB_CONFIG[this.currentRepository];
            const github = window.app.githubAPI;

            // Overview statistics
            this.elements.numberOfChecks.text((stats.numberOfChecks || 0).toLocaleString());
            this.elements.ongoingChecks.text((stats.ongoingChecks || 0).toLocaleString());
            this.elements.lastUpdated.text(new Date().toLocaleTimeString());

            // Update overview statistic links
            this.elements.numberOfChecksLink.attr('href', github.generateAllChecksSearchUrl(repoConfig.owner, repoConfig.repo));
            this.elements.ongoingChecksLink.attr('href', github.generateOngoingChecksSearchUrl(repoConfig.owner, repoConfig.repo));

            // Category counts (with safe access)
            const categories = stats.completedByCategory || {};
            this.elements.institutionCount.text((categories.institution || 0).toLocaleString());
            this.elements.journalCount.text((categories.journal || 0).toLocaleString());
            this.elements.communityCount.text((categories.community || 0).toLocaleString());
            this.elements.conferenceWorkshopCount.text((categories.conferenceWorkshop || 0).toLocaleString());
            this.elements.needsCodecheckerCount.text((categories.needsCodechecker || 0).toLocaleString());

            // Update category links
            this.elements.institutionLink.attr('href', github.generateCompletedCategorySearchUrl(repoConfig.owner, repoConfig.repo, 'institution'));
            this.elements.journalLink.attr('href', github.generateCompletedCategorySearchUrl(repoConfig.owner, repoConfig.repo, 'journal'));
            this.elements.communityLink.attr('href', github.generateCompletedCategorySearchUrl(repoConfig.owner, repoConfig.repo, 'community'));
            this.elements.conferenceWorkshopLink.attr('href', github.generateCompletedCategorySearchUrl(repoConfig.owner, repoConfig.repo, 'conference/workshop'));
            this.elements.needsCodecheckerLink.attr('href', github.generateCompletedCategorySearchUrl(repoConfig.owner, repoConfig.repo, 'needs codechecker'));

        } catch (error) {
            console.error('Error updating statistics display:', error);
            // Set default values on error
            this.elements.numberOfChecks.text('0');
            this.elements.ongoingChecks.text('0');
            this.elements.institutionCount.text('0');
            this.elements.journalCount.text('0');
            this.elements.communityCount.text('0');
            this.elements.conferenceWorkshopCount.text('0');
            this.elements.needsCodecheckerCount.text('0');

            // Disable links on error
            const disabledLink = 'javascript:void(0)';
            this.elements.numberOfChecksLink.attr('href', disabledLink);
            this.elements.ongoingChecksLink.attr('href', disabledLink);
            this.elements.institutionLink.attr('href', disabledLink);
            this.elements.journalLink.attr('href', disabledLink);
            this.elements.communityLink.attr('href', disabledLink);
            this.elements.conferenceWorkshopLink.attr('href', disabledLink);
            this.elements.needsCodecheckerLink.attr('href', disabledLink);
        }
    }

    /**
     * Show the create issue modal
     */
    showCreateIssueModal() {
        if (!this.currentIdentifier) return;

        try {
            const github = window.app.githubAPI;
            const repoConfig = GITHUB_CONFIG[this.currentRepository];

            // Use the current value from the title input (either auto-generated or manually edited)
            const title = this.elements.issueTitlePreview.val().trim() ||
                         github.generateIssueTitle('certificate', this.currentIdentifier.identifier, this.authorNames);

            // Create issue body using user input or template
            const userDescription = this.elements.issueDescription.val().trim();
            let body;

            // Check if user has provided custom description (different from default template)
            if (userDescription && userDescription !== this.defaultDescriptionTemplate) {
                // Use user's custom description
                body = userDescription;
            } else {
                // Use default template with identifier
                body = ISSUE_TEMPLATES['codecheck-entry'].replace('{identifier}', this.currentIdentifier.identifier);
            }

            // Update modal content
            this.elements.modalRepository.text(`${repoConfig.name} (${repoConfig.owner}/${repoConfig.repo})`);
            this.elements.modalIdentifier.text(this.currentIdentifier.identifier);
            this.elements.modalTitlePreview.text(title);
            this.elements.modalBodyPreview.text(body);

            this.displaySelectedLabels(this.elements.modalLabels);
            this.displaySelectedCodecheckers(this.elements.modalCodecheckers);

            // Generate GitHub URL with multiple assignees
            const assignees = this.selectedCodecheckers.map(c => c.handle);
            const githubUrl = github.generateIssueURL(
                repoConfig.owner,
                repoConfig.repo,
                title,
                body,
                this.selectedLabels,
                assignees
            );

            this.elements.githubCreateLink.attr('href', githubUrl);

            // Show the modal
            const modal = new bootstrap.Modal(this.elements.createIssueModal[0]);
            modal.show();

        } catch (error) {
            console.error('Error showing create issue modal:', error);
            this.showError('Failed to prepare issue creation. Please try again.');
        }
    }

    /**
     * Load codecheckers if not already loaded
     */
    async loadCodecheckersIfNeeded() {
        if (this.codecheckerManager.isLoaded || this.codecheckerManager.isLoading) {
            return;
        }

        this.elements.codecheckerLoading.show();

        try {
            await this.codecheckerManager.loadCodecheckers();
            this.elements.codecheckerCount.text(`(${this.codecheckerManager.codecheckers.length} available)`);
        } catch (error) {
            console.error('Failed to load codecheckers:', error);
            this.elements.codecheckerCount.text('(failed to load)');
        } finally {
            this.elements.codecheckerLoading.hide();
        }
    }

    /**
     * Handle codechecker search input
     */
    onCodecheckerSearch(query) {
        // Clear previous timeout
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }

        // Debounce search
        this.searchTimeout = setTimeout(() => {
            this.performCodecheckerSearch(query);
        }, 300);
    }

    /**
     * Perform codechecker search and update dropdown
     */
    performCodecheckerSearch(query) {
        if (!query || query.length < 2) {
            this.elements.codecheckerDropdown.hide();
            return;
        }

        const results = this.codecheckerManager.searchCodecheckers(query);
        this.displayCodecheckerResults(results, query);
    }

    /**
     * Display codechecker search results
     */
    displayCodecheckerResults(results, query = '') {
        const dropdown = this.elements.codecheckerDropdown;
        dropdown.empty();
        this.highlightedCodecheckerIndex = -1; // Reset highlighting

        if (results.length === 0) {
            dropdown.append(`
                <div class="dropdown-item-text text-muted">
                    No codecheckers found
                </div>
            `);
        } else {
            results.forEach(codechecker => {
                // Get highlighted name and handle
                const displayName = codechecker.name || codechecker.handle;
                const highlightedName = query ? this.codecheckerManager.highlightMatches(displayName, query) : displayName;
                const highlightedHandle = query ? this.codecheckerManager.highlightMatches(codechecker.handle, query) : codechecker.handle;

                // Format skills with highlighting
                const allSkills = codechecker.allSkills || [];
                const matchingSkills = codechecker.matchInfo?.skillMatches || [];
                const skillsHtml = allSkills.length > 0 ?
                    this.codecheckerManager.formatSkillsWithHighlight(allSkills, matchingSkills, query) : '';

                // Build skills display
                const skillsSection = skillsHtml ? `<div class="text-secondary small mt-1"><strong>Skills:</strong> ${skillsHtml}</div>` : '';

                // Build ORCID display (without icon, non-clickable for search results)
                const orcidSection = codechecker.orcid ? `<div class="text-info small mt-1">${this.formatOrcidDisplay(codechecker.orcid, false, false)}</div>` : '';

                const item = $(`
                    <a href="#" class="dropdown-item codechecker-item" data-handle="${codechecker.handle}">
                        <div class="d-flex justify-content-between align-items-start">
                            <div class="flex-grow-1">
                                <div class="fw-bold">${highlightedName}</div>
                                <div class="text-muted small">@${highlightedHandle}</div>
                                ${skillsSection}
                                ${orcidSection}
                            </div>
                        </div>
                    </a>
                `);

                item.on('click', (e) => {
                    e.preventDefault();
                    this.selectCodechecker(codechecker);
                });

                dropdown.append(item);
            });
        }

        dropdown.show();
    }

    /**
     * Add a codechecker to the selection
     */
    selectCodechecker(codechecker) {
        // Check if already selected
        if (this.selectedCodecheckers.find(c => c.handle === codechecker.handle)) {
            console.log('Codechecker already selected:', codechecker.handle);
            this.elements.codecheckerDropdown.hide();
            return;
        }

        // Add to selected list
        this.selectedCodecheckers.push(codechecker);

        // Clear search input
        this.elements.codecheckerSearch.val('');

        // Update display
        this.updateSelectedCodecheckersDisplay();
        this.updateNeedsCodecheckerLabel();
        this.elements.codecheckerDropdown.hide();

        console.log('Added codechecker:', codechecker.handle);
        console.log('Selected codecheckers:', this.selectedCodecheckers.map(c => c.handle));
    }

    /**
     * Remove a codechecker from the selection
     */
    removeCodechecker(handle) {
        this.selectedCodecheckers = this.selectedCodecheckers.filter(c => c.handle !== handle);
        this.updateSelectedCodecheckersDisplay();
        this.updateNeedsCodecheckerLabel();
        console.log('Removed codechecker:', handle);
    }

    /**
     * Update the display of selected codecheckers
     */
    updateSelectedCodecheckersDisplay() {
        const container = this.elements.selectedCodecheckers;
        container.empty();

        if (this.selectedCodecheckers.length === 0) {
            return;
        }

        this.selectedCodecheckers.forEach(codechecker => {
            const badge = $(`
                <div class="selected-codechecker-badge">
                    <div class="codechecker-info">
                        <span class="codechecker-name">${codechecker.name || codechecker.handle}</span>
                        <span class="codechecker-handle">@${codechecker.handle}</span>
                    </div>
                    <button type="button" class="btn-close remove-codechecker" data-handle="${codechecker.handle}" aria-label="Remove ${codechecker.name || codechecker.handle}"></button>
                </div>
            `);
            container.append(badge);
        });
    }

    /**
     * Update the "needs codechecker" label based on assigned codecheckers
     */
    updateNeedsCodecheckerLabel() {
        const hasCodecheckers = this.selectedCodecheckers.length > 0;
        const needsCodecheckerIndex = this.selectedLabels.indexOf('needs codechecker');

        if (hasCodecheckers && needsCodecheckerIndex !== -1) {
            // Remove "needs codechecker" label when codecheckers are assigned
            this.selectedLabels.splice(needsCodecheckerIndex, 1);
            console.log('Removed "needs codechecker" label - codecheckers assigned');
        } else if (!hasCodecheckers && needsCodecheckerIndex === -1) {
            // Add "needs codechecker" label when no codecheckers are assigned
            this.selectedLabels.push('needs codechecker');
            console.log('Added "needs codechecker" label - no codecheckers assigned');
        }

        // Update the labels display if available
        if (this.availableLabels.length > 0) {
            this.displayAvailableLabels();
        }
    }

    /**
     * Handle issue description field focus
     */
    handleDescriptionFocus() {
        const currentValue = this.elements.issueDescription.val().trim();

        // If the current value is exactly the default template, clear it for editing
        if (currentValue === this.defaultDescriptionTemplate) {
            this.elements.issueDescription.val('');
            this.elements.issueDescription.addClass('editing-template');
        }
    }

    /**
     * Handle issue description field blur
     */
    handleDescriptionBlur() {
        const currentValue = this.elements.issueDescription.val().trim();

        // If the field is empty, restore the default template
        if (currentValue === '') {
            this.elements.issueDescription.val(this.defaultDescriptionTemplate);
            this.elements.issueDescription.removeClass('editing-template');
        }
    }

    /**
     * Handle keyboard navigation in codechecker dropdown
     */
    handleCodecheckerKeydown(e) {
        const dropdown = this.elements.codecheckerDropdown;
        const items = dropdown.find('.codechecker-item');

        if (items.length === 0 || !dropdown.is(':visible')) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.highlightedCodecheckerIndex = Math.min(this.highlightedCodecheckerIndex + 1, items.length - 1);
                this.updateCodecheckerHighlight(items);
                break;

            case 'ArrowUp':
                e.preventDefault();
                this.highlightedCodecheckerIndex = Math.max(this.highlightedCodecheckerIndex - 1, 0);
                this.updateCodecheckerHighlight(items);
                break;

            case 'Enter':
                e.preventDefault();
                if (this.highlightedCodecheckerIndex >= 0 && this.highlightedCodecheckerIndex < items.length) {
                    $(items[this.highlightedCodecheckerIndex]).click();
                }
                break;

            case 'Escape':
                e.preventDefault();
                dropdown.hide();
                this.highlightedCodecheckerIndex = -1;
                break;
        }
    }

    /**
     * Update visual highlighting of codechecker items
     */
    updateCodecheckerHighlight(items) {
        items.removeClass('keyboard-highlighted');
        if (this.highlightedCodecheckerIndex >= 0) {
            $(items[this.highlightedCodecheckerIndex]).addClass('keyboard-highlighted');

            // Scroll item into view if needed
            const highlightedItem = $(items[this.highlightedCodecheckerIndex]);
            const dropdown = this.elements.codecheckerDropdown;
            const itemTop = highlightedItem.position().top;
            const itemHeight = highlightedItem.outerHeight();
            const dropdownHeight = dropdown.height();
            const scrollTop = dropdown.scrollTop();

            if (itemTop < 0) {
                dropdown.scrollTop(scrollTop + itemTop);
            } else if (itemTop + itemHeight > dropdownHeight) {
                dropdown.scrollTop(scrollTop + itemTop + itemHeight - dropdownHeight);
            }
        }
    }

    /**
     * Clear codechecker selection
     */
    clearCodecheckerSelection() {
        this.selectedCodecheckers = [];
        this.elements.codecheckerSearch.val('');
        this.updateSelectedCodecheckersDisplay();
        this.updateNeedsCodecheckerLabel();
        this.elements.codecheckerDropdown.hide();
        console.log('Cleared all codechecker selections');
    }

    /**
     * Reset results when repository changes
     */
    resetResults() {
        this.currentIdentifier = null;
        this.currentStats = null;
        this.selectedLabels = ['certificate', 'needs codechecker']; // Reset to default
        this.authorNames = '';
        this.titleManuallyEdited = false; // Reset title edit tracking
        this.elements.authorNames.val('');
        this.elements.issueTitlePreview.val(''); // Clear the title field
        this.clearCodecheckerSelection();
        this.elements.issueDescription.val(this.defaultDescriptionTemplate); // Reset to template
        this.elements.issueDescription.removeClass('editing-template');
        this.elements.highestIdentifierLink.hide(); // Hide the highest identifier link
        this.elements.identifierWarnings.hide(); // Hide identifier warnings
        this.elements.resultsContainer.hide();
        this.elements.statsContainer.hide();
        this.elements.createIssueBtn.prop('disabled', true);
        this.hideError();
    }


    /**
     * Update the repository indicator text based on current selection
     */
    updateRepositoryIndicator() {
        const repoConfig = GITHUB_CONFIG[this.currentRepository];
        const displayText = repoConfig ? `- ${repoConfig.name}` : '- Unknown Repository';
        this.elements.currentRepositoryIndicator.text(displayText);
    }

    /**
     * Get currently selected repository
     */
    getCurrentRepository() {
        return this.currentRepository;
    }

}