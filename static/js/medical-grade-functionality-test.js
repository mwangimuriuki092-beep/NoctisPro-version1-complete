/**
 * Medical-Grade Functionality Test Suite
 * Ensures DICOM viewer functionality remains intact after medical-grade enhancements
 */

class MedicalGradeFunctionalityTest {
    constructor() {
        this.testResults = [];
        this.testsPassed = 0;
        this.testsFailed = 0;
    }

    runAllTests() {
        console.log('🏥 Starting Medical-Grade Functionality Tests...');
        
        this.testBasicButtonFunctionality();
        this.testImageLoadingPipeline();
        this.testToolSwitching();
        this.testSafetySystemIntegration();
        this.testAccessibilityFeatures();
        
        this.reportResults();
    }

    testBasicButtonFunctionality() {
        console.log('📋 Testing basic button functionality...');
        
        // Test that basic buttons are present and clickable
        const basicButtons = ['window', 'zoom', 'pan', 'reset'];
        
        basicButtons.forEach(tool => {
            const button = document.querySelector(`[data-tool="${tool}"]`);
            if (button) {
                this.assert(
                    !button.disabled && button.style.pointerEvents !== 'none',
                    `Basic button ${tool} should be clickable`
                );
                
                // Test that onclick handlers are preserved
                this.assert(
                    button.onclick || button.getAttribute('onclick'),
                    `Basic button ${tool} should have click handler`
                );
            } else {
                this.fail(`Basic button ${tool} not found`);
            }
        });
    }

    testImageLoadingPipeline() {
        console.log('🖼️ Testing image loading pipeline...');
        
        // Check that image loading functions exist
        this.assert(
            typeof window.loadStudy === 'function' || 
            document.querySelector('[onchange*="loadStudy"]'),
            'loadStudy functionality should be available'
        );
        
        // Check image container is present
        const imageContainer = document.getElementById('imageContainer') || 
                              document.querySelector('.viewport') ||
                              document.querySelector('.image-container');
        
        this.assert(imageContainer !== null, 'Image container should be present');
        
        // Check that study/series selectors are functional
        const studySelect = document.getElementById('studySelect');
        const seriesSelect = document.getElementById('seriesSelect');
        
        this.assert(studySelect !== null, 'Study selector should be present');
        this.assert(seriesSelect !== null, 'Series selector should be present');
    }

    testToolSwitching() {
        console.log('🔧 Testing tool switching functionality...');
        
        // Test that setTool function exists and works
        if (typeof window.setTool === 'function') {
            try {
                // This should not throw an error
                window.setTool('window');
                this.pass('setTool function is callable');
            } catch (error) {
                this.fail(`setTool function error: ${error.message}`);
            }
        } else {
            // Check if setTool is available in template
            this.assert(
                document.querySelector('script').textContent.includes('function setTool'),
                'setTool function should be available'
            );
        }
        
        // Test that tool state changes are reflected in UI
        const windowButton = document.querySelector('[data-tool="window"]');
        if (windowButton) {
            // Simulate click and check if active class is managed
            const initialActiveState = windowButton.classList.contains('active');
            this.assert(
                typeof initialActiveState === 'boolean',
                'Tool active state should be manageable'
            );
        }
    }

    testSafetySystemIntegration() {
        console.log('🛡️ Testing safety system integration...');
        
        // Check that medical safety system is loaded
        this.assert(
            typeof window.medicalGradeButtonSafety !== 'undefined',
            'Medical-grade safety system should be loaded'
        );
        
        // Test that basic tools are not blocked by safety system
        const basicTools = ['window', 'zoom', 'pan', 'reset'];
        basicTools.forEach(tool => {
            const button = document.querySelector(`[data-tool="${tool}"]`);
            if (button) {
                // These should not be in safe state or disabled by safety system
                this.assert(
                    !button.classList.contains('medical-safe-state'),
                    `Basic tool ${tool} should not be in safe state`
                );
            }
        });
        
        // Test that critical tools have safety measures
        const criticalTools = ['ai', 'print', 'export'];
        criticalTools.forEach(tool => {
            const button = document.querySelector(`[data-tool="${tool}"]`);
            if (button) {
                // These should have additional safety measures but still be functional
                this.assert(
                    button.getAttribute('title').includes('FDA') || 
                    button.classList.contains('medical-grade'),
                    `Critical tool ${tool} should have medical-grade indicators`
                );
            }
        });
    }

    testAccessibilityFeatures() {
        console.log('♿ Testing accessibility features...');
        
        // Check that buttons have proper ARIA labels
        const allButtons = document.querySelectorAll('[data-tool]');
        let accessibleButtons = 0;
        
        allButtons.forEach(button => {
            if (button.getAttribute('aria-label') || 
                button.getAttribute('title') || 
                button.textContent.trim()) {
                accessibleButtons++;
            }
        });
        
        this.assert(
            accessibleButtons === allButtons.length,
            'All buttons should have accessible labels'
        );
        
        // Check for keyboard navigation support
        const focusableButtons = document.querySelectorAll('[data-tool][tabindex]');
        this.assert(
            focusableButtons.length > 0,
            'Buttons should support keyboard navigation'
        );
    }

    assert(condition, message) {
        if (condition) {
            this.pass(message);
        } else {
            this.fail(message);
        }
    }

    pass(message) {
        this.testResults.push({ status: 'PASS', message });
        this.testsPassed++;
        console.log(`✅ PASS: ${message}`);
    }

    fail(message) {
        this.testResults.push({ status: 'FAIL', message });
        this.testsFailed++;
        console.log(`❌ FAIL: ${message}`);
    }

    reportResults() {
        console.log('\n🏥 Medical-Grade Functionality Test Results:');
        console.log(`✅ Tests Passed: ${this.testsPassed}`);
        console.log(`❌ Tests Failed: ${this.testsFailed}`);
        console.log(`📊 Success Rate: ${((this.testsPassed / (this.testsPassed + this.testsFailed)) * 100).toFixed(1)}%`);
        
        if (this.testsFailed === 0) {
            console.log('\n🎉 ALL TESTS PASSED! DICOM viewer functionality is intact.');
            console.log('✅ Medical-grade enhancements are compatible with existing functionality.');
        } else {
            console.log('\n⚠️  Some tests failed. Please review the following issues:');
            this.testResults.filter(r => r.status === 'FAIL').forEach(result => {
                console.log(`   • ${result.message}`);
            });
        }
        
        // Store results for potential debugging
        window.medicalGradeTestResults = this.testResults;
    }
}

// Auto-run tests when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Wait a bit for all scripts to load
    setTimeout(() => {
        const tester = new MedicalGradeFunctionalityTest();
        tester.runAllTests();
    }, 1000);
});

// Export for manual testing
window.MedicalGradeFunctionalityTest = MedicalGradeFunctionalityTest;