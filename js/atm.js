// Enhanced WebGazer.js Custom Events Implementation

// Configuration options
const config = {
  gazeThresholdDuration: 300, // 1.5 seconds for ATM interactions
  gazeAttributeName: "gazer-target",
  gazeEventName: "gazeEvent",
  debugMode: false,
};

// Track elements being gazed at with timestamps
const gazeTargets = {
  currentElement: null,
  gazeStart: null,
  activeTimers: new Map(),
  currentPosition: { x: 0, y: 0 },
};

// Initialize WebGazer with existing calibration
async function initGazeTargeting() {
  try {
    // Check if WebGazer is already initialized
    if (webgazer.isReady()) {
      console.log("WebGazer is already initialized");
    } else {
      console.log("Initializing WebGazer and loading calibration data");
    }

    // Load the saved calibration data
    // // const loadedCalibration = await webgazer.loadCalibrationFromLocalStorage();

    // if (loadedCalibration) {
    //   console.log('Successfully loaded calibration data');
    // } else {
    //   console.warn('No calibration data found in localStorage');
    // }

    // Start WebGazer with the gaze listener
    await webgazer.setGazeListener(handleGaze).begin();

    // Hide video by default (less distracting)
    // webgazer.showVideo(false);

    // Set prediction points based on debug mode
    webgazer.showPredictionPoints(config.debugMode);

    console.log("WebGazer initialized with custom gaze targeting");
    return true;
  } catch (error) {
    console.error("Error initializing WebGazer:", error);
    return false;
  }
}

// Main gaze handler
function handleGaze(data, timestamp) {
  if (!data) return; // No gaze data available

  const { x, y } = data;
  gazeTargets.currentPosition = { x, y };

  if (config.debugMode) {
    document.getElementById("debug-info").textContent = `Gaze: x=${x.toFixed(
      0
    )}, y=${y.toFixed(0)}`;
  }

  // Update gaze indicator
  const indicator = document.getElementById("gaze-indicator");
  if (indicator) {
    indicator.style.display = "block";
    indicator.style.left = `${x}px`;
    indicator.style.top = `${y}px`;
  }

  // Find all elements with the gazer-target attribute
  const targetElements = document.querySelectorAll(
    `[${config.gazeAttributeName}="true"]`
  );

  // Check if gaze is in any target element
  let foundElement = null;

  targetElements.forEach((element) => {
    if (!element.closest(".screen.active")) return; // Only process elements in active screen

    const rect = element.getBoundingClientRect();

    if (
      x >= rect.left &&
      x <= rect.right &&
      y >= rect.top &&
      y <= rect.bottom
    ) {
      foundElement = element;
      element.classList.add("gazer-hover");
    } else {
      element.classList.remove("gazer-hover");
    }
  });

  // Handle element gazing logic
  handleElementGazing(foundElement);
}

// Track gaze duration on elements
function handleElementGazing(element) {
  const now = Date.now();

  // If looking at a new element or no element
  if (element !== gazeTargets.currentElement) {
    // Clear previous element timer
    if (gazeTargets.currentElement) {
      clearElementTimer(gazeTargets.currentElement);
    }

    // Set new current element
    gazeTargets.currentElement = element;

    // Start timer for new element
    if (element) {
      gazeTargets.gazeStart = now;

      // Create timer for this element
      const timerId = setTimeout(() => {
        triggerGazeEvent(element);
      }, getGazeDuration(element));

      gazeTargets.activeTimers.set(element, timerId);

      if (config.debugMode) {
        console.log(`Started gazing at:`, element);
      }
    }
  }
}

// Get custom duration from element or use default
function getGazeDuration(element) {
  // Check if element has custom duration attribute
  const customDuration = element.getAttribute("gazer-duration");
  return customDuration
    ? parseInt(customDuration)
    : config.gazeThresholdDuration;
}

// Clear timer for an element
function clearElementTimer(element) {
  if (gazeTargets.activeTimers.has(element)) {
    clearTimeout(gazeTargets.activeTimers.get(element));
    gazeTargets.activeTimers.delete(element);

    if (config.debugMode) {
      console.log(`Stopped gazing at:`, element);
    }
  }
}

// Trigger the custom gaze event
function triggerGazeEvent(element) {
  // Add visual feedback for the element
  element.classList.add("pressed");
  setTimeout(() => {
    element.classList.remove("pressed");
  }, 300);

  // Create and dispatch custom event
  const gazeEvent = new CustomEvent(config.gazeEventName, {
    bubbles: true,
    detail: {
      timestamp: Date.now(),
      duration: getGazeDuration(element),
      element: element,
    },
  });

  element.dispatchEvent(gazeEvent);

  if (config.debugMode) {
    console.log(`Gaze event triggered on:`, element, gazeEvent.detail);
  }

  // Clear the timer
  gazeTargets.activeTimers.delete(element);
}

// Toggle debug mode
function toggleDebug(enabled) {
  config.debugMode = enabled;
  webgazer.showPredictionPoints(enabled);

  const debugInfo = document.getElementById("debug-info");
  if (debugInfo) {
    debugInfo.style.display = enabled ? "block" : "none";
  }

  console.log(`Debug mode ${enabled ? "enabled" : "disabled"}`);
}

// Clean up resources
function cleanupGazeTargeting() {
  // Clear all active timers
  gazeTargets.activeTimers.forEach((timerId) => {
    clearTimeout(timerId);
  });
  gazeTargets.activeTimers.clear();

  // Stop webgazer
  if (webgazer && webgazer.isReady()) {
    webgazer.end();
  }
}

// ATM Application Logic
document.addEventListener("DOMContentLoaded", function () {
  // Constants
  const PIN_LENGTH = 3;
  const CORRECT_PIN = "123"; // Demo PIN
  const ACCOUNT_BALANCE = 25000;

  // State
  let currentPin = "";
  let currentWithdrawalAmount = 0;

  // UI Elements
  const screens = document.querySelectorAll(".screen");
  const statusIndicator = document.getElementById("status-indicator");
  const statusText = document.getElementById("status-text");
  const notification = document.getElementById("notification");
  const pinDisplay = document.getElementById("pin-display");

  // Initialize
  function init() {
    // Set up event listeners
    document
      .getElementById("start-tracking")
      .addEventListener("click", startApp);

    // Add event listeners to all gaze targets
    document.querySelectorAll('[gazer-target="true"]').forEach((element) => {
      element.addEventListener("gazeEvent", handleGazeInteraction);
    });

    // Debug toggle with keyboard shortcut
    document.addEventListener("keydown", function (e) {
      if (e.key === "d" && e.ctrlKey) {
        toggleDebug(!config.debugMode);
      }
    });
  }

  // Start the application
  async function startApp() {
    showScreen("loading-screen");

    // Initialize WebGazer with existing calibration
    const initialized = await initGazeTargeting();

    if (initialized) {
      updateStatus(true);
      showNotification("Eye tracking activated", "success");
      setTimeout(() => {
        showScreen("welcome-screen");
      }, 1500);
    } else {
      showNotification("Failed to initialize eye tracking", "error");
    }
  }

  // Handle gaze events on interactive elements
  function handleGazeInteraction(e) {
    const element = e.detail.element;

    // Key press handling
    if (element.classList.contains("key")) {
      const key = element.getAttribute("data-key");
      handleKeyPress(key);
    }
    // Amount selection handling
    else if (element.hasAttribute("data-amount")) {
      const amount = parseInt(element.getAttribute("data-amount"));
      handleAmountSelection(amount);
    }
    // Button handling
    else {
      switch (element.id) {
        case "start-button":
          showScreen("pin-screen");
          break;
        case "withdrawal-button":
          showScreen("withdrawal-screen");
          break;
        case "balance-button":
          showProcessingScreen("Checking Balance");
          setTimeout(() => {
            updateDateTime("balance-date", "balance-time");
            showScreen("balance-screen");
          }, 2000);
          break;
        case "back-to-transactions":
          showScreen("transaction-screen");
          break;
        case "balance-done-button":
        case "withdrawal-done-button":
          showScreen("thank-you-screen");
          break;
        case "new-transaction-button":
          resetApp();
          showScreen("welcome-screen");
          break;
      }
    }
  }

  // Handle virtual keyboard key press
  function handleKeyPress(key) {
    switch (key) {
      case "clear":
        currentPin = "";
        updatePinDisplay();
        break;
      case "enter":
        verifyPin();
        break;
      default:
        if (currentPin.length < PIN_LENGTH) {
          currentPin += key;
          updatePinDisplay();
          if (currentPin.length === PIN_LENGTH) {
            // Auto-verify after full PIN
            setTimeout(verifyPin, 500);
          }
        }
        break;
    }
  }

  // Handle amount selection
  function handleAmountSelection(amount) {
    currentWithdrawalAmount = amount;
    showProcessingScreen("Processing Withdrawal");

    setTimeout(() => {
      updateDateTime("withdrawal-date", "withdrawal-time");
      document.getElementById(
        "withdrawal-amount"
      ).textContent = `₹${amount}.00`;
      showScreen("withdrawal-complete-screen");
    }, 2000);
  }

  // Verify PIN
  function verifyPin() {
    setTimeout(() => {
      showScreen("transaction-screen");
    }, 2000);
    return;
    if (currentPin === CORRECT_PIN) {
      showProcessingScreen("Verifying PIN");
      setTimeout(() => {
        showScreen("transaction-screen");
      }, 2000);
    } else {
      showNotification("Incorrect PIN", "error");
      currentPin = "";
      updatePinDisplay();
    }
  }

  // Update PIN display mask
  function updatePinDisplay() {
    let display = "";
    for (let i = 0; i < PIN_LENGTH; i++) {
      display += i < currentPin.length ? "*" : "_";
    }
    pinDisplay.textContent = display;
  }

  // Show processing screen with custom text
  function showProcessingScreen(text) {
    document.getElementById("processing-text").textContent = text;
    showScreen("processing-screen");
  }

  // Update date and time in receipts
  function updateDateTime(dateId, timeId) {
    const now = new Date();
    document.getElementById(dateId).textContent =
      now.toLocaleDateString("en-IN");
    document.getElementById(timeId).textContent = now.toLocaleTimeString(
      "en-IN",
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  }

  // Reset application state
  function resetApp() {
    currentPin = "";
    currentWithdrawalAmount = 0;
    updatePinDisplay();
  }

  // Show notification
  function showNotification(message, type) {
    notification.textContent = message;
    notification.className = "notification";
    notification.classList.add(type);
    notification.classList.add("show");

    setTimeout(() => {
      notification.classList.remove("show");
    }, 3000);
  }

  // Update WebGazer status in UI
  function updateStatus(active) {
    if (active) {
      statusIndicator.classList.add("active");
      statusText.textContent = "Eye Tracking: Active";
    } else {
      statusIndicator.classList.remove("active");
      statusText.textContent = "Eye Tracking: Inactive";
    }
  }

  // Show screen by ID
  function showScreen(screenId) {
    screens.forEach((screen) => {
      screen.classList.remove("active");
    });
    document.getElementById(screenId).classList.add("active");
  }

  // Initialize the app
  init();

  // Set global for debugging
  window.ATM = {
    toggleDebug,
    resetApp,
  };
});
