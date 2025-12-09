// Game state
const gameState = {
    currentClue: 1,
    cluesFound: [],
    currentTab: 'map',
    totalMapClues: 3,
    constellationRotation: 0,
    constellationUnlocked: false,
    gridUnlocked: false,
    hitRadius: 2,  // Percentage radius for valid clicks (2% of map size)
    collectedOrnaments: []
};

// Clue data - customize these for your treasure hunt
const clues = {
    1: "Count five palm trees north from the lighthouse to find the first treasure.",
    2: "The Candy Cane shines bright. Study its stars to find the next treasure.",
    3: "From the pier, follow ⭐ then 🔷"
};

// Custom notifications for each clue found
const clueFoundMessages = {
    1: "Underneath some coconut husks, you find your next clue, a <strong>constellation map</strong> and a star shaped ornament with an engraving on it...",
    2: "Digging through the sand you find your next clue and a diamond shaped ornament with an engraving on it...",
    3: "You found the final treasure! Be the first to reply to the Teams message with the message '<b>I found all the treasures!</b>' to win!"
};

// Ornament data - images to show when clues are found
// Customize these paths to point to your ornament images
const ornaments = {
    1: {
        image: "ornament1.png",  // Image for first clue (e.g., star with "3N")
        alt: "Star Ornament"
    },
    2: {
        image: "ornament2.png",  // Image for second clue (e.g., diamond with "2E")
        alt: "Diamond Ornament"
    }
};

// Hotspot positions - obfuscated to prevent easy cheating
// To update: encode your positions as base64(JSON.stringify({clueNumber: {top: "30%", left: "20%"}}))
// Use hotspot-encoder.html or browser console: btoa(JSON.stringify({1: {top: "30%", left: "20%"}, 2: {top: "45%", left: "60%"}, 3: {top: "70%", left: "35%"}}))
const _hd = "eyIxIjp7InRvcCI6IjcwJSIsImxlZnQiOiI3NSUifSwiMiI6eyJ0b3AiOiI2OSUiLCJsZWZ0IjoiNTElIn0sIjMiOnsidG9wIjoiNDYlIiwibGVmdCI6IjcwJSJ9fQ==";

// Decode hotspot data
function _dh() {
    try {
        return JSON.parse(atob(_hd));
    } catch (e) {
        console.error("Failed to decode hotspot data");
        return {};
    }
}

// Initialize the game
document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initMapClicks();
    initRotation();
    startGame();
});

// Start the game with first clue
function startGame() {
    addClueToList(1, clues[1]);
    showNotification("Find the first location to begin...", 'notification-display');
}

// Tab switching functionality
function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.dataset.tab;
            switchTab(targetTab);
        });
    });
}

function switchTab(tabName) {
    // Update buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Update content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(tabName).classList.add('active');

    // If clicking on constellation tab, remove the highlight
    if (tabName === 'constellation') {
        const constellationBtn = document.querySelector('[data-tab="constellation"]');
        constellationBtn.classList.remove('highlight');
    }
    
    gameState.currentTab = tabName;
}

// Initialize map click detection
function initMapClicks() {
    const mapContainer = document.getElementById('map-container');
    
    mapContainer.addEventListener('click', (e) => {
        // Only process clicks if we're on the map tab and have an active clue
        if (gameState.currentTab !== 'map' || gameState.currentClue > gameState.totalMapClues) {
            return;
        }
        
        // Get click position relative to map
        const rect = mapContainer.getBoundingClientRect();
        const clickX = ((e.clientX - rect.left) / rect.width) * 100;
        const clickY = ((e.clientY - rect.top) / rect.height) * 100;
        
        // Check if click is near the target hotspot
        if (checkHotspotHit(clickX, clickY, gameState.currentClue)) {
            handleCorrectClick(clickX, clickY, gameState.currentClue);
        }
    });
}

// Check if click coordinates hit the target hotspot
function checkHotspotHit(clickX, clickY, clueNumber) {
    const hotspotData = _dh();
    const target = hotspotData[clueNumber];
    
    if (!target) return false;
    
    // Parse target percentages
    const targetX = parseFloat(target.left);
    const targetY = parseFloat(target.top);
    
    // Calculate distance
    const distance = Math.sqrt(
        Math.pow(clickX - targetX, 2) + 
        Math.pow(clickY - targetY, 2)
    );
    
    // Check if within hit radius
    return distance <= gameState.hitRadius;
}

// Handle a successful hotspot click
function handleCorrectClick(clickX, clickY, clueNumber) {

    // Prevent multiple finds for the same clue
    if (gameState.cluesFound.includes(clueNumber)) {
        return;
    }

    // Mark as found
    gameState.cluesFound.push(clueNumber);

    // Create visual feedback element at click location
    const mapContainer = document.getElementById('map-container');
    const hotspot = document.createElement('div');
    hotspot.classList.add('hotspot', 'found');
    hotspot.style.top = `${clickY}%`;
    hotspot.style.left = `${clickX}%`;
    
    mapContainer.appendChild(hotspot);
    
    // Continue with game logic
    setTimeout(() => {
        //hotspot.remove();
        revealClue(clueNumber);
    }, 1000);
}

function revealClue(clueNumber) {
    
    
    // Mark the clue as solved (strike-through)
    markClueAsSolved(clueNumber);
    
    // Reveal ornament if this clue has one (clues 1 and 2)
    if (ornaments[clueNumber]) {
        revealOrnament(clueNumber);
    }
    
    // Update progress
    updateProgress();
    
    // Show custom notification for this clue
    const message = clueFoundMessages[clueNumber] || "Location found!";
    showNotification(message, 'notification-display', true);
    
    // Check if this is clue 1 - unlock constellation
    if (clueNumber === 1 && !gameState.constellationUnlocked) {
        unlockConstellationTab();
    }

    if (clueNumber >= 2 && !gameState.gridUnlocked){
        unlockGrid();
    }
    
    // Check if there's a next clue (but not the final one)
    if (gameState.currentClue < gameState.totalMapClues) {
        gameState.currentClue++;
        
        // Add next clue after a delay
        setTimeout(() => {
            addClueToList(gameState.currentClue, clues[gameState.currentClue]);
        }, clueNumber === 1 ? 0 : 0); // Longer delay after first clue due to constellation unlock
        
    } else {
        // All clues found - victory animation
        setTimeout(() => {
            celebrateVictory();
        }, 1500);
    }
}

// Constellation rotation functionality with slider
function initRotation() {
    const rotationSlider = document.getElementById('rotation-slider');
    const constellationImg = document.getElementById('constellation-img');
    const rotationDisplay = document.getElementById('rotation-angle');
    const mapOverlay = document.querySelector('.map-overlay');
    
    if (!rotationSlider) return; // Guard for when elements don't exist
    
    // Handle slider input for rotation
    rotationSlider.addEventListener('input', () => {
        gameState.constellationRotation = parseInt(rotationSlider.value);
        updateRotation(constellationImg, rotationDisplay);
    });
    
    // Add rotating class when mouse is pressed on slider
    rotationSlider.addEventListener('mousedown', () => {
        if (mapOverlay) {
            mapOverlay.classList.add('rotating');
        }
    });
    
    // Remove rotating class when mouse is released anywhere
    document.addEventListener('mouseup', () => {
        if (mapOverlay) {
            mapOverlay.classList.remove('rotating');
        }
    });
}

function updateRotation(img, display) {
    img.style.transform = `rotate(${gameState.constellationRotation}deg)`;
    display.textContent = gameState.constellationRotation;
}

// Unlock constellation tab - it's a reference tool
function unlockConstellationTab() {
    gameState.constellationUnlocked = true;
    const constellationBtn = document.querySelector('[data-tab="constellation"]');
    constellationBtn.classList.remove('hidden');
    constellationBtn.classList.add('highlight');
    //constellationBtn.style.animation = 'pulse 1.5s ease 3';
}

function unlockGrid(){
    gameState.gridUnlocked = true;
    const gridElement = document.querySelector('.map-container');
    gridElement.classList.add('grid');
}

// Reveal an ornament in the display
function revealOrnament(clueNumber) {
    const ornamentData = ornaments[clueNumber];
    if (!ornamentData) return;
    
    gameState.collectedOrnaments.push(clueNumber);
    
    const slot = document.getElementById(`ornament-${clueNumber}`);
    if (!slot) return;
    
    // Add collected class for animation
    slot.classList.add('collected');
    
    // Create and add the ornament image
    const img = document.createElement('img');
    img.src = ornamentData.image;
    img.alt = ornamentData.alt;
    img.classList.add('ornament-image');
    
    // Handle image load error
    img.onerror = () => {
        // If image fails to load, show a styled placeholder instead
        slot.innerHTML = `<div style="color: #d4af37; font-size: 1.5em; font-weight: bold;">
            ${clueNumber === 1 ? '⭐' : '🔷'}
        </div>`;
    };
    
    slot.appendChild(img);
}

// Add a clue to the visible list
function addClueToList(clueNumber, clueText) {
    const clueList = document.getElementById('clue-list');
    const clueItem = document.createElement('div');
    clueItem.classList.add('clue-item');
    clueItem.dataset.clue = clueNumber;
    clueItem.innerHTML = `<p>${clueText}</p>`;
    clueList.appendChild(clueItem);
}

// Mark a clue as solved (strike-through)
function markClueAsSolved(clueNumber) {
    const clueItem = document.querySelector(`.clue-item[data-clue="${clueNumber}"]`);
    if (clueItem) {
        clueItem.classList.add('solved');
    }
}

// Display notifications
function showNotification(text, targetId, highlight = false) {
    const displayBox = document.getElementById(targetId);
    displayBox.innerHTML = `<p>${text}</p>`;
    
    if (highlight) {
        displayBox.classList.add('highlight');
        setTimeout(() => {
            displayBox.classList.remove('highlight');
        }, 600);
    }
}

// Update progress counter
function updateProgress() {
    const countElement = document.getElementById('clue-count');
    const totalFound = gameState.cluesFound.length;
    const totalClues = gameState.totalMapClues;
    
    countElement.textContent = totalFound;
    countElement.style.animation = 'none';
    setTimeout(() => {
        countElement.style.animation = 'pulse 0.5s ease';
    }, 10);
    
    // Update total display
    const progressText = document.querySelector('.progress p');
    progressText.innerHTML = `Clues Found: <span id="clue-count">${totalFound}</span>/${totalClues}`;
}

// Victory celebration effect
function celebrateVictory() {
    console.log("Victory!");
    
    document.body.style.animation = 'none';
    setTimeout(() => {
        document.body.style.animation = 'celebrationFlash 0.5s ease 3';
    }, 10);
}

// Add celebration animation to CSS dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes celebrationFlash {
        0%, 100% { filter: brightness(1); }
        50% { filter: brightness(1.3); }
    }
`;
document.head.appendChild(style);

// Export game state for debugging
window.gameState = gameState;