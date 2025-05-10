/**
 * Combined ATM Interface with Eye-Tracking and Voice Control
 * This script integrates both eye-tracking and voice control for an accessible ATM interface
 */

document.addEventListener("DOMContentLoaded", function () {
  // ------------------------------------------------------------
  // Constants and Configuration
  // ------------------------------------------------------------
  // PIN and Account configuration
  const PIN_LENGTH = 3;
  const CORRECT_PIN = "123"; // Demo PIN
  const ACCOUNT_BALANCE = 25000;

  // Eye-tracking configuration
  const gazeConfig = {
    gazeThresholdDuration: 300, // milliseconds for gaze interaction
    gazeAttributeName: "gazer-target",
    gazeEventName: "gazeEvent",
    debugMode: false,
  };

  // Speech configuration
  const speechConfig = {
    enabled: true,
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
    voice: null // Will be set when a voice is selected
  };

  // ------------------------------------------------------------
  // State Variables
  // ------------------------------------------------------------
  // PIN and transaction state
  let currentPin = "";
  let currentWithdrawalAmount = 0;

  // Gaze tracking state
  const gazeTargets = {
    currentElement: null,
    gazeStart: null,
    activeTimers: new Map(),
    currentPosition: { x: 0, y: 0 },
  };

  // Voice control state
  let recognition;
  let isVoiceControlActive = false;
  let isListening = false;
  let isSpeaking = false;
  let lastCommandTime = 0;
  const COMMAND_DEBOUNCE = 1000; // 1 second between commands

  // ------------------------------------------------------------
  // UI Elements
  // ------------------------------------------------------------
  // Core UI elements
  const screens = document.querySelectorAll(".screen");
  const statusIndicator = document.getElementById("status-indicator");
  const statusText = document.getElementById("status-text");
  const notification = document.getElementById("notification");
  const pinDisplay = document.getElementById("pin-display");

  // Voice control UI elements
  const voiceIndicator = document.getElementById("voice-indicator");
  const commandFeedback = document.getElementById("command-feedback");
  const eyeControlToggle = document.getElementById("eye-control-toggle");
  const voiceControlToggle = document.getElementById("voice-control-toggle");
  const helpButton = document.getElementById("help-button");
  const commandsModal = document.getElementById("commands-modal");
  const closeModal = document.getElementById("close-modal");
  const speakingIndicator = document.getElementById("speaking-indicator");

  // ------------------------------------------------------------
  // Initialization
  // ------------------------------------------------------------
  
  function init() {
    // Set up event listeners for eye-tracking
    document.getElementById("start-tracking").addEventListener("click", startApp);

    // Add event listeners to all gaze targets
    document.querySelectorAll(`[${gazeConfig.gazeAttributeName}="true"]`).forEach((element) => {
      element.addEventListener(gazeConfig.gazeEventName, handleGazeInteraction);
    });

    // Debug toggle with keyboard shortcut
    document.addEventListener("keydown", function (e) {
      if (e.key === "d" && e.ctrlKey) {
        toggleDebug(!gazeConfig.debugMode);
      }
    });

    // Initialize voice control if supported
    initVoiceControl();

    // Initialize speech synthesis
    initSpeechSynthesis();

    // Button click handlers (for testing without eye tracking)
    setupClickHandlers();
  }

  // Initialize speech synthesis
  function initSpeechSynthesis() {
    if ('speechSynthesis' in window) {
      // Wait for voices to be loaded
      speechSynthesis.onvoiceschanged = function() {
        const voices = speechSynthesis.getVoices();
        // Prefer a female voice for better clarity
        speechConfig.voice = voices.find(voice => 
          voice.lang.includes('en') && voice.name.includes('Female')
        ) || voices[0];
      };
      
      // Some browsers don't fire the voiceschanged event
      if (speechSynthesis.getVoices().length > 0) {
        speechSynthesis.onvoiceschanged();
      }
    }
  }

  // Start the application
  async function startApp() {
    showScreen("loading-screen");

    // Initialize WebGazer with existing calibration
    const initialized = await initGazeTargeting();

    if (initialized) {
      updateStatus(true);
      showNotification("Eye tracking activated", "success");
      
      // Default to eye control
      setActiveControl("eye");
      
      setTimeout(() => {
        showScreen("welcome-screen");
      }, 1500);
    } else {
      showNotification("Failed to initialize eye tracking", "error");
    }
  }

  // ------------------------------------------------------------
  // Eye Tracking Functions
  // ------------------------------------------------------------
  // [Previous eye tracking functions remain unchanged...]
  // Initialize WebGazer with existing calibration
  async function initGazeTargeting() {
    try {
      // Check if WebGazer is already initialized
      if (webgazer.isReady()) {
        console.log("WebGazer is already initialized");
      } else {
        console.log("Initializing WebGazer and loading calibration data");
      }

      // Start WebGazer with the gaze listener
      await webgazer.setGazeListener(handleGaze).begin();

      // Hide video by default (less distracting)
      // webgazer.showVideo(false);

      // Set prediction points based on debug mode
      webgazer.showPredictionPoints(gazeConfig.debugMode);

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

    if (gazeConfig.debugMode) {
      document.getElementById("debug-info").textContent = `Gaze: x=${x.toFixed(0)}, y=${y.toFixed(0)}`;
    }

    // Update gaze indicator
    const indicator = document.getElementById("gaze-indicator");
    if (indicator) {
      indicator.style.display = "block";
      indicator.style.left = `${x}px`;
      indicator.style.top = `${y}px`;
    }

    // Skip if voice control is active or system is speaking
    if (isVoiceControlActive || isSpeaking) return;

    // Find all elements with the gazer-target attribute
    const targetElements = document.querySelectorAll(`[${gazeConfig.gazeAttributeName}="true"]`);

    // Check if gaze is in any target element
    let foundElement = null;

    targetElements.forEach((element) => {
      if (!element.closest(".screen.active")) return; // Only process elements in active screen

      const rect = element.getBoundingClientRect();

      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
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

        if (gazeConfig.debugMode) {
          console.log(`Started gazing at:`, element);
        }
      }
    }
  }

  // Get custom duration from element or use default
  function getGazeDuration(element) {
    // Check if element has custom duration attribute
    const customDuration = element.getAttribute("gazer-duration");
    return customDuration ? parseInt(customDuration) : gazeConfig.gazeThresholdDuration;
  }

  // Clear timer for an element
  function clearElementTimer(element) {
    if (gazeTargets.activeTimers.has(element)) {
      clearTimeout(gazeTargets.activeTimers.get(element));
      gazeTargets.activeTimers.delete(element);

      if (gazeConfig.debugMode) {
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
    const gazeEvent = new CustomEvent(gazeConfig.gazeEventName, {
      bubbles: true,
      detail: {
        timestamp: Date.now(),
        duration: getGazeDuration(element),
        element: element,
      },
    });

    element.dispatchEvent(gazeEvent);

    if (gazeConfig.debugMode) {
      console.log(`Gaze event triggered on:`, element, gazeEvent.detail);
    }

    // Clear the timer
    gazeTargets.activeTimers.delete(element);
  }

  // Toggle debug mode
  function toggleDebug(enabled) {
    gazeConfig.debugMode = enabled;
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
            updateDateTime("balance");
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
        case "eye-control-toggle":
          setActiveControl("eye");
          break;
        case "voice-control-toggle":
          setActiveControl("voice");
          break;
        case "help-button":
          commandsModal.style.display = "flex";
          break;
        case "close-modal":
          commandsModal.style.display = "none";
          break;
      }
    }
  }

  // ------------------------------------------------------------
  // Voice Control Functions
  // ------------------------------------------------------------
  // Initialize voice control
  function initVoiceControl() {
    // Check if browser supports SpeechRecognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      // Browser doesn't support speech recognition
      showNotification("Voice control not supported in this browser.", "error");
      if (voiceControlToggle) {
        voiceControlToggle.disabled = true;
        voiceControlToggle.style.opacity = 0.5;
      }
      return;
    }

    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    // Event listeners for interaction toggle
    if (eyeControlToggle) {
      eyeControlToggle.addEventListener("click", function () {
        setActiveControl("eye");
      });
    }

    if (voiceControlToggle) {
      voiceControlToggle.addEventListener("click", function () {
        setActiveControl("voice");
      });
    }

    // Help button event listener
    if (helpButton) {
      helpButton.addEventListener("click", function () {
        commandsModal.style.display = "flex";
      });
    }

    if (closeModal) {
      closeModal.addEventListener("click", function () {
        commandsModal.style.display = "none";
      });
    }

    // Voice recognition event listeners
    recognition.onstart = function() {
      isListening = true;
      if (voiceIndicator) {
        voiceIndicator.classList.add("listening");
      }
    };

    recognition.onend = function () {
      isListening = false;
      if (voiceIndicator) {
        voiceIndicator.classList.remove("listening");
      }

      // Restart recognition if voice control is active and not speaking
      if (isVoiceControlActive && !isSpeaking) {
        setTimeout(() => {
          try {
            recognition.start();
          } catch (e) {
            console.error("Recognition already started:", e);
          }
        }, 500);
      }
    };

    recognition.onerror = function (event) {
      console.error("Speech recognition error:", event.error);
      if (voiceIndicator) {
        voiceIndicator.classList.remove("listening");
      }

      if (event.error === "not-allowed") {
        showNotification(
          "Microphone access denied. Please allow microphone access to use voice control.",
          "error"
        );
        setActiveControl("eye");
      }

      // Try to restart after error if not speaking
      if (isVoiceControlActive && !isSpeaking) {
        setTimeout(() => {
          try {
            recognition.start();
          } catch (e) {
            console.error("Failed to restart recognition:", e);
          }
        }, 3000);
      }
    };

    recognition.onresult = function (event) {
      const now = Date.now();
      // Debounce to prevent rapid consecutive commands
      if (now - lastCommandTime < COMMAND_DEBOUNCE) {
        return;
      }
      lastCommandTime = now;
      
      const command = event.results[0][0].transcript.toLowerCase().trim();
      handleVoiceCommand(command);
    };

    // Add click event to voice indicator to toggle listening
    if (voiceIndicator) {
      voiceIndicator.addEventListener("click", function () {
        toggleVoiceListening();
      });
    }
  }

  // Improved speak function with proper recognition management
  async function speak(text, interrupt = true) {
    if (!speechConfig.enabled) return;

    // Skip if already speaking the same text
    if (isSpeaking && !interrupt) return;
    
    return new Promise((resolve) => {
      isSpeaking = true;
      
      // Show speaking indicator
      if (speakingIndicator) {
        speakingIndicator.style.display = "block";
      }

      // Cancel any ongoing speech if interrupt is true
      if (interrupt && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      
      // Pause recognition before speaking
      if (isVoiceControlActive && recognition && isListening) {
        recognition.stop();
      }
      
      // Create and speak the utterance
      if (window.speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = speechConfig.rate;
        utterance.pitch = speechConfig.pitch;
        utterance.volume = speechConfig.volume;
        
        if (speechConfig.voice) {
          utterance.voice = speechConfig.voice;
        }
        
        utterance.onend = () => {
          isSpeaking = false;
          if (speakingIndicator) {
            speakingIndicator.style.display = "none";
          }
          
          // Resume recognition after speaking completes
          if (isVoiceControlActive && recognition && !isListening) {
            setTimeout(() => {
              try {
                recognition.start();
              } catch (e) {
                console.error("Failed to restart recognition:", e);
              }
            }, 300);
          }
          resolve();
        };
        
        utterance.onerror = (event) => {
          console.error("Speech synthesis error:", event);
          isSpeaking = false;
          if (speakingIndicator) {
            speakingIndicator.style.display = "none";
          }
          
          // Still attempt to resume recognition
          if (isVoiceControlActive && recognition && !isListening) {
            setTimeout(() => {
              try {
                recognition.start();
              } catch (e) {
                console.error("Failed to restart recognition:", e);
              }
            }, 300);
          }
          resolve();
        };
        
        window.speechSynthesis.speak(utterance);
      } else {
        isSpeaking = false;
        resolve();
      }
    });
  }

  // Show screen with voice guidance
  function showScreen(screenId) {
    screens.forEach((screen) => {
      screen.classList.remove("active");
    });
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
      targetScreen.classList.add("active");
      
      // Provide voice guidance when screen changes
      if (isVoiceControlActive) {
        setTimeout(() => {
          switch(screenId) {
            case "welcome-screen":
              speak("Welcome to accessible ATM. Say 'Start' to begin or 'Help' for commands.");
              break;
            case "pin-screen":
              speak("Please enter your 3 digit PIN. Say numbers zero through nine, 'Clear' to start over, or 'Enter' when done.");
              break;
            case "transaction-screen":
              speak("Transaction screen. Say 'Withdrawal' to get cash or 'Balance' to check your account balance.");
              break;
            case "withdrawal-screen":
              speak("Select withdrawal amount. Say 'One hundred', 'Two hundred', or 'Five hundred' rupees.");
              break;
            case "balance-screen":
              const balance = document.querySelector("#withdrawal-complete-screen > div.receipt > p.total > span").textContent;
              if (balance) {
                speak(`Your account balance is ${balance}. Say 'Done' to continue.`);
              }
              break;
            case "withdrawal-complete-screen":
              const amount = document.getElementById("withdrawal-amount")?.textContent;
              if (amount) {
                speak(`Withdrawal complete. ${amount} dispensed. Say 'Done' to continue.`);
              }
              break;
            case "thank-you-screen":
              speak("Thank you for using our ATM. Say 'New transaction' to start over.");
              break;
          }
        }, 300);
      }
    }
  }

  // Toggle voice listening
  function toggleVoiceListening() {
    if (isListening) {
      recognition.stop();
    } else if (isVoiceControlActive && !isSpeaking) {
      try {
        recognition.start();
      } catch (e) {
        console.error("Recognition error:", e);
      }
    }
  }

  // Set active control method
  function setActiveControl(method) {
    if (method === "eye") {
      if (eyeControlToggle) eyeControlToggle.classList.add("active");
      if (voiceControlToggle) voiceControlToggle.classList.remove("active");
      isVoiceControlActive = false;

      // Stop voice recognition if it's running
      if (isListening && recognition) {
        recognition.stop();
      }

      // Update status text
      if (statusText) {
        statusText.textContent = "Eye Tracking: Active";
      }
      showNotification("Eye control activated", "info");
    } else if (method === "voice") {
      if (voiceControlToggle) voiceControlToggle.classList.add("active");
      if (eyeControlToggle) eyeControlToggle.classList.remove("active");
      isVoiceControlActive = true;

      // Start voice recognition if not speaking
      if (recognition && !isSpeaking) {
        try {
          recognition.start();
        } catch (e) {
          console.error("Recognition already started:", e);
        }
      }

      // Update status text
      if (statusText) {
        statusText.textContent = "Voice Control: Active";
      }
      showNotification('Voice control activated. Say "Help" for commands.', "info");
    }
  }

  // Handle voice commands with improved speech flow
  async function handleVoiceCommand(command) {
    console.log("Voice command recognized:", command);
    command = command.replace(".", "");
    showCommandFeedback(command);
    
    // Prevent processing while speaking
    if (isSpeaking) return;

    // Process command and speak feedback
    switch(command) {
      case "one": case "two": case "three": case "four": case "five":
      case "six": case "seven": case "eight": case "nine": case "zero":
        await speak(command);
        break;
      case "clear":
        await speak("PIN cleared");
        break;
      case "enter":
        case "submit":
        await speak("Verifying PIN");
        break;
    }

    if (command.includes("voice")) {
      webgazer.pause();
      return;
    }
    if (command.includes("visual")) {
      webgazer.resume();
      return;
    }
    if (command.includes("help")) {
      if (commandsModal) {
        commandsModal.style.display = "flex";
      }
      return;
    }

    // Get current active screen
    const activeScreen = document.querySelector(".screen.active");
    if (!activeScreen) return;
    
    const screenId = activeScreen.id;

    switch (screenId) {
      case "welcome-screen":
        if (command.includes("start")) {
          const startButton = document.getElementById("start-button");
          if (startButton) startButton.click();
        }
        break;

      case "pin-screen":
        await handlePinScreenCommands(command);
        break;

      case "transaction-screen":
        if (command.includes("withdrawal") || command.includes("cash")) {
          const withdrawalButton = document.getElementById("withdrawal-button");
          if (withdrawalButton) withdrawalButton.click();
        } else if (command.includes("balance") || command.includes("inquiry")) {
          const balanceButton = document.getElementById("balance-button");
          if (balanceButton) balanceButton.click();
        }
        break;

      case "withdrawal-screen":
        if (command.includes("hundred") && !command.includes("two") && !command.includes("five")) {
          const btn100 = document.querySelector('[data-amount="100"]');
          if (btn100) btn100.click();
        } else if (command.includes("two hundred") || command.includes("200")) {
          const btn200 = document.querySelector('[data-amount="200"]');
          if (btn200) btn200.click();
        } else if (command.includes("five hundred") || command.includes("500")) {
          const btn500 = document.querySelector('[data-amount="500"]');
          if (btn500) btn500.click();
        } else if (command.includes("back")) {
          const backButton = document.getElementById("back-to-transactions");
          if (backButton) backButton.click();
        }
        break;

      case "balance-screen":
        if (command.includes("done")) {
          const doneButton = document.getElementById("balance-done-button");
          if (doneButton) doneButton.click();
        }
        break;

      case "withdrawal-complete-screen":
        if (command.includes("done")) {
          const doneButton = document.getElementById("withdrawal-done-button");
          if (doneButton) doneButton.click();
        }
        break;

      case "thank-you-screen":
        if (command.includes("new") && command.includes("transaction")) {
          const newTransactionButton = document.getElementById("new-transaction-button");
          if (newTransactionButton) newTransactionButton.click();
        }
        break;
    }
  }

  // Handle PIN screen specific commands with async/await
  async function handlePinScreenCommands(command) {
    command = command.replace(".", "");
    // Number input
    const numbers = {
      zero: "0",
      one: "1",
      two: "2",
      three: "3",
      four: "4",
      five: "5",
      six: "6",
      seven: "7",
      eight: "8",
      nine: "9",
      0: "0",
      1: "1",
      2: "2",
      3: "3",
      4: "4",
      5: "5",
      6: "6",
      7: "7",
      8: "8",
      9: "9",
    };

    // Check for direct number commands
    for (const [word, number] of Object.entries(numbers)) {
      if (command.includes(word)) {
        handleKeyPress(number);
        await speak(number);
        return;
      }
    }

    // Other PIN commands
    if (command.includes("clear")) {
      handleKeyPress("clear");
      await speak("PIN cleared");
    } else if (command.includes("enter") || command.includes("submit")) {
      handleKeyPress("enter");
      await speak("Verifying PIN");
    }
  }

  // Show command feedback
  function showCommandFeedback(command) {
    if (!commandFeedback) return;
    
    commandFeedback.textContent = `Command: "${command}"`;
    commandFeedback.classList.add("visible");

    setTimeout(() => {
      commandFeedback.classList.remove("visible");
    }, 3000);
  }

  // ------------------------------------------------------------
  // PIN and ATM Interaction Functions
  // ------------------------------------------------------------
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

  // Update PIN display mask
  function updatePinDisplay() {
    if (!pinDisplay) return;
    
    let display = "";
    for (let i = 0; i < PIN_LENGTH; i++) {
      display += i < currentPin.length ? "*" : "_";
    }
    pinDisplay.textContent = display;
  }

  // Verify PIN
  function verifyPin() {
    // For demo purposes, we'll just proceed to transaction screen
    showProcessingScreen("Verifying PIN");
    setTimeout(() => {
      showScreen("transaction-screen");
    }, 2000);
    return;
    
    // This is the actual PIN verification logic that would be used in production
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

  // Handle amount selection
  async function handleAmountSelection(amount) {
    currentWithdrawalAmount = amount;
    await speak(`Withdrawing ${amount} rupees`);
    showProcessingScreen("Processing Withdrawal");

    setTimeout(() => {
      updateDateTime("withdrawal");
      document.getElementById("withdrawal-amount").textContent = `₹${amount}.00`;
      showScreen("withdrawal-complete-screen");
    }, 2000);
  }

  // ------------------------------------------------------------
  // UI Helper Functions
  // ------------------------------------------------------------
  // Show processing screen with custom text
  function showProcessingScreen(text) {
    const processingText = document.getElementById("processing-text");
    if (processingText) {
      processingText.textContent = text;
    }
    showScreen("processing-screen");
  }

  // Update date and time in receipts
  function updateDateTime(type) {
    const now = new Date();
    const date = now.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const time = now.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    if (type === "balance") {
      if (document.getElementById("balance-date")) {
        document.getElementById("balance-date").textContent = date;
      }
      if (document.getElementById("balance-time")) {
        document.getElementById("balance-time").textContent = time;
      }
    } else if (type === "withdrawal") {
      if (document.getElementById("withdrawal-date")) {
        document.getElementById("withdrawal-date").textContent = date;
      }
      if (document.getElementById("withdrawal-time")) {
        document.getElementById("withdrawal-time").textContent = time;
      }
    }
  }

  // Reset application state
  function resetApp() {
    currentPin = "";
    currentWithdrawalAmount = 0;
    updatePinDisplay();
  }

  // Show notification
  async function showNotification(message, type = "info") {
    if (!notification) return;
    
    notification.textContent = message;
    notification.className = "notification";
    notification.classList.add(type);
    notification.classList.add("show");

    // Speak important notifications
    if (type === "error" || (isVoiceControlActive && type === "info")) {
      await speak(message);
    }

    setTimeout(() => {
      notification.classList.remove("show");
    }, 3000);
  }

  // Update WebGazer status in UI
  function updateStatus(active) {
    if (!statusIndicator || !statusText) return;
    
    if (active) {
      statusIndicator.classList.add("active");
      statusText.textContent = "Eye Tracking: Active";
    } else {
      statusIndicator.classList.remove("active");
      statusText.textContent = "Eye Tracking: Inactive";
    }
  }

  // Setup click handlers for testing without eye tracking
  function setupClickHandlers() {
    // Handle number keys
    document.querySelectorAll(".key").forEach((key) => {
      key.addEventListener("click", function () {
        const keyValue = this.getAttribute("data-key");
        handleKeyPress(keyValue);
      });
    });

    // Handle amount selection
    document.querySelectorAll("[data-amount]").forEach((button) => {
      button.addEventListener("click", function () {
        const amount = parseInt(this.getAttribute("data-amount"));
        handleAmountSelection(amount);
      });
    });

    // Handle navigation buttons
    document.getElementById("start-button").addEventListener("click", function () {
      showScreen("pin-screen");
    });

    document.getElementById("withdrawal-button").addEventListener("click", function () {
      showScreen("withdrawal-screen");
    });

    document.getElementById("balance-button").addEventListener("click", function () {
      showProcessingScreen("Checking Balance");
      setTimeout(() => {
        updateDateTime("balance");
        showScreen("balance-screen");
      }, 2000);
    });

    document.getElementById("back-to-transactions").addEventListener("click", function () {
      showScreen("transaction-screen");
    });

    document.getElementById("balance-done-button").addEventListener("click", function () {
      showScreen("thank-you-screen");
    });

    document.getElementById("withdrawal-done-button").addEventListener("click", function () {
      showScreen("thank-you-screen");
    });

    document.getElementById("new-transaction-button").addEventListener("click", function () {
      resetApp();
      showScreen("welcome-screen");
    });
  }

  // ------------------------------------------------------------
  // Application Lifecycle
  // ------------------------------------------------------------
  // Initialize the application
  init();

  // Clean up resources when window is closed
  window.addEventListener("beforeunload", function () {
    cleanupGazeTargeting();
    if (recognition) {
      recognition.stop();
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  });
});