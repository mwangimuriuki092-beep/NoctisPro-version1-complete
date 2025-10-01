/**
 * Enhanced Search System
 * Safe enhancement - adds advanced search without modifying existing functionality
 */

class EnhancedSearch {
    constructor() {
        this.searchCache = new Map();
        this.searchHistory = JSON.parse(localStorage.getItem('noctis_search_history') || '[]');
        this.init();
    }
    
    init() {
        this.enhanceExistingSearch();
    }
    
    enhanceExistingSearch() {
        // Find existing search inputs and enhance them
        const searchInputs = document.querySelectorAll('input[type="search"], input[placeholder*="search"], input[id*="search"]');
        
        searchInputs.forEach(input => {
            if (!input.hasAttribute('data-enhanced')) {
                input.setAttribute('data-enhanced', 'true');
                this.enhanceSearchInput(input);
            }
        });
    }
    
    enhanceSearchInput(input) {
        // Add debounced search
        let searchTimeout;
        
        input.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.performEnhancedSearch(e.target.value, input);
            }, 300);
        });
        
        // Add search suggestions dropdown
        this.createSuggestionsDropdown(input);
        
        // Add search history
        this.addSearchHistoryToInput(input);
        
        // Add keyboard navigation
        input.addEventListener('keydown', (e) => {
            this.handleSearchKeydown(e, input);
        });
    }
    
    createSuggestionsDropdown(input) {
        const dropdown = document.createElement('div');
        dropdown.className = 'search-suggestions';
        dropdown.style.cssText = `
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: var(--card-bg, #252525);
            border: 1px solid var(--border-color, #404040);
            border-top: none;
            border-radius: 0 0 6px 6px;
            max-height: 300px;
            overflow-y: auto;
            z-index: 1000;
            display: none;
        `;
        
        // Make input container relative
        const container = input.parentElement;
        if (container && getComputedStyle(container).position === 'static') {
            container.style.position = 'relative';
        }
        
        container.appendChild(dropdown);
        input.setAttribute('data-suggestions-id', dropdown.className);
    }
    
    performEnhancedSearch(query, input) {
        if (query.length < 2) return;
        
        // Cache search results
        if (this.searchCache.has(query)) {
            this.displaySearchSuggestions(this.searchCache.get(query), input);
            return;
        }
        
        // Generate search suggestions based on context
        const suggestions = this.generateSearchSuggestions(query);
        
        this.searchCache.set(query, suggestions);
        this.displaySearchSuggestions(suggestions, input);
        
        // Add to search history
        this.addToSearchHistory(query);
    }
    
    generateSearchSuggestions(query) {
        const suggestions = [];
        
        // Medical imaging specific suggestions
        const medicalTerms = [
            'CT Chest', 'CT Abdomen', 'CT Head', 'CT Spine',
            'MRI Brain', 'MRI Spine', 'MRI Knee', 'MRI Shoulder',
            'X-Ray Chest', 'X-Ray Hand', 'X-Ray Foot', 'X-Ray Spine',
            'Ultrasound Abdomen', 'Ultrasound Pelvis', 'Ultrasound Heart',
            'Mammography', 'Nuclear Medicine', 'PET CT', 'SPECT'
        ];
        
        const modalities = ['CT', 'MRI', 'XR', 'US', 'NM', 'PT', 'MG', 'CR', 'DR'];
        const bodyParts = ['Head', 'Chest', 'Abdomen', 'Pelvis', 'Spine', 'Extremities'];
        const priorities = ['Urgent', 'High', 'Normal', 'Low'];
        const statuses = ['Pending', 'In Progress', 'Completed', 'Cancelled'];
        
        const queryLower = query.toLowerCase();
        
        // Add matching medical terms
        medicalTerms.forEach(term => {
            if (term.toLowerCase().includes(queryLower)) {
                suggestions.push({
                    type: 'medical_term',
                    text: term,
                    description: 'Medical imaging study type'
                });
            }
        });
        
        // Add matching modalities
        modalities.forEach(modality => {
            if (modality.toLowerCase().includes(queryLower)) {
                suggestions.push({
                    type: 'modality',
                    text: `Modality: ${modality}`,
                    description: 'Filter by imaging modality'
                });
            }
        });
        
        // Add matching body parts
        bodyParts.forEach(part => {
            if (part.toLowerCase().includes(queryLower)) {
                suggestions.push({
                    type: 'body_part',
                    text: `Body Part: ${part}`,
                    description: 'Filter by body part'
                });
            }
        });
        
        // Add date-based suggestions
        if (queryLower.includes('today') || queryLower.includes('yesterday')) {
            suggestions.push({
                type: 'date',
                text: 'Today\'s studies',
                description: 'Studies from today'
            });
            suggestions.push({
                type: 'date',
                text: 'Yesterday\'s studies',
                description: 'Studies from yesterday'
            });
        }
        
        return suggestions.slice(0, 8); // Limit to 8 suggestions
    }
    
    displaySearchSuggestions(suggestions, input) {
        const dropdown = input.parentElement.querySelector('.search-suggestions');
        if (!dropdown) return;
        
        if (suggestions.length === 0) {
            dropdown.style.display = 'none';
            return;
        }
        
        dropdown.innerHTML = suggestions.map(suggestion => `
            <div class="suggestion-item" data-text="${suggestion.text}" style="
                padding: 10px 15px;
                cursor: pointer;
                border-bottom: 1px solid var(--border-color, #404040);
                transition: background 0.2s ease;
            " onmouseover="this.style.background='var(--secondary-bg, #1a1a1a)'" 
               onmouseout="this.style.background='transparent'"
               onclick="this.closest('.search-suggestions').previousElementSibling.value='${suggestion.text}'; this.closest('.search-suggestions').style.display='none';">
                <div style="font-weight: 600; color: var(--text-primary, #ffffff);">
                    ${suggestion.text}
                </div>
                <div style="font-size: 11px; color: var(--text-secondary, #b3b3b3);">
                    ${suggestion.description}
                </div>
            </div>
        `).join('');
        
        dropdown.style.display = 'block';
        
        // Hide dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!input.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.style.display = 'none';
            }
        });
    }
    
    addSearchHistoryToInput(input) {
        // Add search history on focus
        input.addEventListener('focus', () => {
            if (input.value === '' && this.searchHistory.length > 0) {
                const historySuggestions = this.searchHistory.slice(-5).map(term => ({
                    type: 'history',
                    text: term,
                    description: 'From search history'
                }));
                
                this.displaySearchSuggestions(historySuggestions, input);
            }
        });
    }
    
    addToSearchHistory(query) {
        if (query.length < 2) return;
        
        // Remove if already exists
        const index = this.searchHistory.indexOf(query);
        if (index > -1) {
            this.searchHistory.splice(index, 1);
        }
        
        // Add to beginning
        this.searchHistory.unshift(query);
        
        // Keep only last 20 searches
        this.searchHistory = this.searchHistory.slice(0, 20);
        
        // Save to localStorage
        localStorage.setItem('noctis_search_history', JSON.stringify(this.searchHistory));
    }
    
    handleSearchKeydown(e, input) {
        const dropdown = input.parentElement.querySelector('.search-suggestions');
        if (!dropdown || dropdown.style.display === 'none') return;
        
        const suggestions = dropdown.querySelectorAll('.suggestion-item');
        let selectedIndex = Array.from(suggestions).findIndex(item => 
            item.style.background !== 'transparent'
        );
        
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                selectedIndex = Math.min(selectedIndex + 1, suggestions.length - 1);
                this.highlightSuggestion(suggestions, selectedIndex);
                break;
                
            case 'ArrowUp':
                e.preventDefault();
                selectedIndex = Math.max(selectedIndex - 1, 0);
                this.highlightSuggestion(suggestions, selectedIndex);
                break;
                
            case 'Enter':
                e.preventDefault();
                if (selectedIndex >= 0 && suggestions[selectedIndex]) {
                    input.value = suggestions[selectedIndex].getAttribute('data-text');
                    dropdown.style.display = 'none';
                    
                    // Trigger search
                    const event = new Event('change', { bubbles: true });
                    input.dispatchEvent(event);
                }
                break;
                
            case 'Escape':
                dropdown.style.display = 'none';
                break;
        }
    }
    
    highlightSuggestion(suggestions, index) {
        suggestions.forEach((item, i) => {
            if (i === index) {
                item.style.background = 'var(--accent-color, #00d4ff)';
                item.style.color = 'var(--primary-bg, #0a0a0a)';
            } else {
                item.style.background = 'transparent';
                item.style.color = 'var(--text-primary, #ffffff)';
            }
        });
    }
}

// Initialize enhanced search when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Only initialize if not already done
    if (!window.enhancedSearch) {
        window.enhancedSearch = new EnhancedSearch();
        console.log('🔍 Enhanced search system activated');
    }
});

// Re-initialize when new content is added dynamically
const searchObserver = new MutationObserver((mutations) => {
    let hasNewSearchInputs = false;
    
    mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
                const searchInputs = node.querySelectorAll && node.querySelectorAll('input[type="search"], input[placeholder*="search"]');
                if (searchInputs && searchInputs.length > 0) {
                    hasNewSearchInputs = true;
                }
            }
        });
    });
    
    if (hasNewSearchInputs && window.enhancedSearch) {
        window.enhancedSearch.enhanceExistingSearch();
    }
});

searchObserver.observe(document.body, {
    childList: true,
    subtree: true
});

// Export for global access
window.EnhancedSearch = EnhancedSearch;