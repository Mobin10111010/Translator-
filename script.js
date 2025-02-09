const LANGUAGES = {
  'af': 'Afrikaans', 'sq': 'Albanian', 'am': 'Amharic', 'ar': 'Arabic', 'hy': 'Armenian',
  'az': 'Azerbaijani', 'bn': 'Bengali', 'bs': 'Bosnian', 'bg': 'Bulgarian', 'my': 'Burmese',
  'ca': 'Catalan', 'ceb': 'Cebuano', 'zh-CN': 'Chinese (Simplified)', 'zh-TW': 'Chinese (Traditional)',
  'co': 'Corsican', 'hr': 'Croatian', 'cs': 'Czech', 'da': 'Danish', 'nl': 'Dutch',
  'en': 'English', 'eo': 'Esperanto', 'et': 'Estonian', 'tl': 'Filipino', 'fi': 'Finnish',
  'fr': 'French', 'fy': 'Frisian', 'gl': 'Galician', 'ka': 'Georgian', 'de': 'German',
  'el': 'Greek', 'gu': 'Gujarati', 'ht': 'Haitian Creole', 'ha': 'Hausa', 'haw': 'Hawaiian',
  'he': 'Hebrew', 'hi': 'Hindi', 'hmn': 'Hmong', 'hu': 'Hungarian', 'is': 'Icelandic',
  'ig': 'Igbo', 'id': 'Indonesian', 'ga': 'Irish', 'it': 'Italian', 'ja': 'Japanese',
  'jw': 'Javanese', 'kn': 'Kannada', 'kk': 'Kazakh', 'km': 'Khmer', 'ko': 'Korean',
  'ku': 'Kurdish', 'ky': 'Kyrgyz', 'lo': 'Lao', 'la': 'Latin', 'lv': 'Latvian',
  'lt': 'Lithuanian', 'lb': 'Luxembourgish', 'mk': 'Macedonian', 'mg': 'Malagasy',
  'ms': 'Malay', 'ml': 'Malayalam', 'mt': 'Maltese', 'mi': 'Maori', 'mr': 'Marathi',
  'mn': 'Mongolian', 'ne': 'Nepali', 'no': 'Norwegian', 'ps': 'Pashto', 'fa': 'Persian',
  'pl': 'Polish', 'pt': 'Portuguese', 'pa': 'Punjabi', 'ro': 'Romanian', 'ru': 'Russian',
  'sm': 'Samoan', 'gd': 'Scots Gaelic', 'sr': 'Serbian', 'st': 'Sesotho', 'sn': 'Shona',
  'sd': 'Sindhi', 'si': 'Sinhala', 'sk': 'Slovak', 'sl': 'Slovenian', 'so': 'Somali',
  'es': 'Spanish', 'su': 'Sundanese', 'sw': 'Swahili', 'sv': 'Swedish', 'tg': 'Tajik',
  'ta': 'Tamil', 'te': 'Telugu', 'th': 'Thai', 'tr': 'Turkish', 'uk': 'Ukrainian',
  'ur': 'Urdu', 'uz': 'Uzbek', 'vi': 'Vietnamese', 'cy': 'Welsh', 'xh': 'Xhosa',
  'yi': 'Yiddish', 'yo': 'Yoruba', 'zu': 'Zulu'
};

class Translator {
  constructor() {
    this.sourceLanguageSelect = document.getElementById('sourceLanguage');
    this.targetLanguageSelect = document.getElementById('targetLanguage');
    this.sourceText = document.getElementById('sourceText');
    this.translatedText = document.getElementById('translatedText');
    this.translateBtn = document.getElementById('translateBtn');
    this.speakBtn = document.getElementById('speakBtn');
    this.recordBtn = document.getElementById('recordBtn');
    this.swapBtn = document.getElementById('swapButton');
    this.sourceSearch = document.getElementById('sourceSearch');
    this.targetSearch = document.getElementById('targetSearch');
    
    this.recognition = null;
    this.isRecording = false;
    
    this.historyPanel = document.getElementById('historyPanel');
    this.historyToggle = document.getElementById('historyToggle');
    this.clearHistoryBtn = document.getElementById('clearHistory');
    this.historyList = document.getElementById('historyList');
    
    this.translationHistory = this.loadHistory();
    
    this.permissionRequest = document.getElementById('permissionRequest');
    this.grantPermissionBtn = document.getElementById('grantPermission');
    
    this.hasMediaPermission = false;
    this.permissionStatus = null;
    this.synth = window.speechSynthesis;
    this.voices = [];
    
    // Load voices when they're available
    if (this.synth) {
      this.synth.onvoiceschanged = () => {
        this.voices = this.synth.getVoices();
      };
    }

    this.voiceSpeedControl = document.getElementById('voiceSpeed');
    this.voicePitchControl = document.getElementById('voicePitch');
    this.copyBtn = document.getElementById('copyBtn');
    this.clearBtn = document.getElementById('clearBtn');
    
    // Enhanced language support configuration
    this.persianConfig = {
      recognition: {
        lang: 'fa-IR',
        alternatives: true,
        maxAlternatives: 3
      },
      synthesis: {
        lang: 'fa-IR',
        voiceURI: 'Google فارسی' // Default Persian voice
      }
    };

    this.initializePermissions();
    this.initializeLanguageSelects();
    this.setupEventListeners();
    this.setupHistoryEventListeners();
    this.setupVoiceControls();
    this.setupCopyAndClear();
    this.renderHistory();
    this.initializeSpeechRecognition();
    this.initializeVoiceSupport();
  }

  async initializePermissions() {
    if (navigator.permissions && navigator.mediaDevices) {
      try {
        this.permissionStatus = await navigator.permissions.query({ name: 'microphone' });
        this.permissionStatus.addEventListener('change', () => {
          this.updatePermissionState(this.permissionStatus.state);
        });
        this.updatePermissionState(this.permissionStatus.state);
      } catch (error) {
        console.error('Permission API error:', error);
        this.handlePermissionError();
      }
    } else {
      this.handleUnsupportedBrowser();
    }
  }

  updatePermissionState(state) {
    switch (state) {
      case 'granted':
        this.hasMediaPermission = true;
        this.hidePermissionRequest();
        this.recordBtn.disabled = false;
        this.initializeSpeechRecognition();
        break;
      case 'denied':
        this.hasMediaPermission = false;
        this.handlePermissionDenied();
        this.recordBtn.disabled = true;
        break;
      case 'prompt':
        this.showPermissionRequest();
        break;
    }
  }

  handleUnsupportedBrowser() {
    const message = document.createElement('div');
    message.className = 'permission-denied';
    message.textContent = 'Your browser does not support speech features. Please use a modern browser.';
    this.permissionRequest.appendChild(message);
    this.recordBtn.disabled = true;
  }

  handlePermissionError() {
    const message = document.createElement('div');
    message.className = 'permission-denied';
    message.textContent = 'Error accessing speech features. Please check your browser settings.';
    this.permissionRequest.appendChild(message);
    this.recordBtn.disabled = true;
  }

  initializeVoiceSupport() {
    if (this.synth) {
      this.synth.onvoiceschanged = () => {
        this.voices = this.synth.getVoices();
        // Specifically look for Persian voices
        this.persianVoices = this.voices.filter(voice => 
          voice.lang.includes('fa') || 
          voice.lang.includes('IR') || 
          voice.name.includes('فارسی')
        );
      };
    }
  }

  initializeSpeechRecognition() {
    if (!this.hasMediaPermission) return;

    if ('webkitSpeechRecognition' in window) {
      this.recognition = new webkitSpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 3;

      this.recognition.onstart = () => {
        this.isRecording = true;
        this.updateRecordButtonState();
        // Show recording indicator
        this.showRecordingIndicator();
      };

      this.recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        // Handle RTL languages like Persian properly
        const isRTL = this.sourceLanguageSelect.value === 'fa';
        this.sourceText.style.direction = isRTL ? 'rtl' : 'ltr';
        this.sourceText.value = finalTranscript || interimTranscript;
      };

      this.recognition.onend = () => {
        this.isRecording = false;
        this.updateRecordButtonState();
        this.hideRecordingIndicator();
        if (this.sourceText.value) {
          this.translate();
        }
      };

      this.recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        this.isRecording = false;
        this.updateRecordButtonState();
        this.hideRecordingIndicator();
        if (event.error === 'not-allowed') {
          this.handlePermissionDenied();
        }
      };
    }
  }

  async speak() {
    if (this.synth.speaking) {
      this.synth.cancel();
      return;
    }

    const text = this.translatedText.value;
    if (!text) return;

    const utterance = new SpeechSynthesisUtterance(text);
    const targetLang = this.targetLanguageSelect.value;
    utterance.lang = targetLang;
    utterance.rate = parseFloat(this.voiceSpeedControl.value);
    utterance.pitch = parseFloat(this.voicePitchControl.value);

    // Enhanced voice selection for Persian
    if (targetLang === 'fa') {
      const persianVoice = this.voices.find(voice => 
        voice.lang.includes('fa') || 
        voice.lang.includes('IR') || 
        voice.name.includes('فارسی')
      );
      if (persianVoice) {
        utterance.voice = persianVoice;
      }
    } else {
      // Default voice selection for other languages
      const targetVoice = this.voices.find(voice => 
        voice.lang.toLowerCase().startsWith(targetLang) ||
        voice.lang.toLowerCase().includes(targetLang)
      ) || this.voices.find(voice => voice.lang.startsWith(targetLang.split('-')[0]));

      if (targetVoice) {
        utterance.voice = targetVoice;
      }
    }

    utterance.onstart = () => {
      this.speakBtn.classList.add('recording');
      this.speakBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="24" height="24">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
        Stop
      `;
    };

    utterance.onend = () => {
      this.resetSpeakButton();
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      this.resetSpeakButton();
      this.showToast('Speech synthesis failed. Please try again.');
    };

    try {
      this.synth.speak(utterance);
    } catch (error) {
      console.error('Speech synthesis error:', error);
      this.showToast('Speech synthesis failed. Please try again.');
      this.resetSpeakButton();
    }
  }

  toggleRecording() {
    if (!this.hasMediaPermission) {
      this.showPermissionRequest();
      return;
    }

    if (!this.recognition) {
      this.initializeSpeechRecognition();
    }

    if (this.isRecording) {
      this.recognition.stop();
    } else {
      try {
        this.sourceText.value = '';
        const sourceLang = this.sourceLanguageSelect.value;
        
        // Set recognition language with special handling for Persian
        if (sourceLang === 'fa') {
          this.recognition.lang = 'fa-IR';
        } else {
          this.recognition.lang = sourceLang;
        }
        
        this.recognition.start();
      } catch (error) {
        console.error('Speech recognition error:', error);
        this.showToast('Speech recognition failed. Please try again.');
      }
    }
  }

  showRecordingIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'recording-indicator';
    indicator.innerHTML = `
      <svg viewBox="0 0 24 24" width="16" height="16" fill="white">
        <circle cx="12" cy="12" r="8"/>
      </svg>
      Recording...
    `;
    document.body.appendChild(indicator);
  }

  hideRecordingIndicator() {
    const indicator = document.querySelector('.recording-indicator');
    if (indicator) {
      indicator.remove();
    }
  }

  initializeLanguageSelects() {
    this.populateLanguageSelect(this.sourceLanguageSelect);
    this.populateLanguageSelect(this.targetLanguageSelect);

    // Set default languages
    this.sourceLanguageSelect.value = 'en';
    this.targetLanguageSelect.value = 'es';
  }

  populateLanguageSelect(select) {
    Object.entries(LANGUAGES)
      .sort((a, b) => a[1].localeCompare(b[1]))
      .forEach(([code, name]) => {
        const option = new Option(name, code);
        select.add(option);
      });
  }

  filterLanguages(searchInput, selectElement) {
    const searchTerm = searchInput.value.toLowerCase();
    Array.from(selectElement.options).forEach(option => {
      const optionText = option.text.toLowerCase();
      option.style.display = optionText.includes(searchTerm) ? '' : 'none';
    });
  }

  setupEventListeners() {
    this.translateBtn.addEventListener('click', () => this.translate());
    this.speakBtn.addEventListener('click', () => this.speak());
    this.swapBtn.addEventListener('click', () => this.swapLanguages());
    this.recordBtn.addEventListener('click', () => this.toggleRecording());
    
    this.sourceSearch.addEventListener('input', () => {
      this.filterLanguages(this.sourceSearch, this.sourceLanguageSelect);
    });
    
    this.targetSearch.addEventListener('input', () => {
      this.filterLanguages(this.targetSearch, this.targetLanguageSelect);
    });

    // Update speech recognition language when source language changes
    this.sourceLanguageSelect.addEventListener('change', () => {
      if (this.recognition) {
        this.recognition.lang = this.sourceLanguageSelect.value;
      }
    });
  }

  setupHistoryEventListeners() {
    this.historyToggle.addEventListener('click', () => {
      this.historyPanel.classList.toggle('active');
    });

    this.clearHistoryBtn.addEventListener('click', () => {
      this.clearHistory();
    });
  }

  loadHistory() {
    const history = localStorage.getItem('translationHistory');
    return history ? JSON.parse(history) : [];
  }

  saveHistory() {
    localStorage.setItem('translationHistory', JSON.stringify(this.translationHistory));
  }

  clearHistory() {
    this.translationHistory = [];
    this.saveHistory();
    this.renderHistory();
  }

  addToHistory(sourceText, translatedText, sourceLang, targetLang) {
    const historyItem = {
      sourceText,
      translatedText,
      sourceLang: LANGUAGES[sourceLang],
      targetLang: LANGUAGES[targetLang],
      timestamp: new Date().toISOString()
    };

    this.translationHistory.unshift(historyItem);
    if (this.translationHistory.length > 50) {
      this.translationHistory.pop();
    }
    
    this.saveHistory();
    this.renderHistory();
  }

  renderHistory() {
    this.historyList.innerHTML = '';
    
    this.translationHistory.forEach((item, index) => {
      const historyItem = document.createElement('div');
      historyItem.className = 'history-item';
      
      const date = new Date(item.timestamp);
      historyItem.innerHTML = `
        <h3>${date.toLocaleDateString()} ${date.toLocaleTimeString()}</h3>
        <p><strong>${item.sourceLang}:</strong> ${item.sourceText}</p>
        <p><strong>${item.targetLang}:</strong> ${item.translatedText}</p>
      `;
      
      this.historyList.appendChild(historyItem);
    });
  }

  async translate() {
    const text = this.sourceText.value;
    if (!text) return;

    try {
      const sourceLang = this.sourceLanguageSelect.value;
      const targetLang = this.targetLanguageSelect.value;
      
      // Show loading state
      this.translateBtn.disabled = true;
      this.translateBtn.innerHTML = `
        <svg class="spinner" viewBox="0 0 50 50" width="24" height="24">
          <circle cx="25" cy="25" r="20" fill="none" stroke="currentColor" stroke-width="5"></circle>
        </svg>
        Translating...
      `;
      
      // Add retry logic for more reliable translations
      const maxRetries = 3;
      let retries = 0;
      let success = false;
      let translatedText = '';
      
      while (!success && retries < maxRetries) {
        try {
          const response = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`);
          
          if (!response.ok) throw new Error('Translation API error');
          
          const data = await response.json();
          translatedText = data[0].map(item => item[0]).join(' ');
          success = true;
        } catch (error) {
          retries++;
          if (retries === maxRetries) throw error;
          await new Promise(resolve => setTimeout(resolve, 1000 * retries));
        }
      }
      
      this.translatedText.value = translatedText;
      
      // Add to history after successful translation
      this.addToHistory(text, translatedText, sourceLang, targetLang);
      
      // Show success animation
      this.translateBtn.classList.add('success');
      setTimeout(() => this.translateBtn.classList.remove('success'), 1000);
    } catch (error) {
      console.error('Translation error:', error);
      alert('Translation failed. Please try again.');
    } finally {
      // Reset button state
      this.translateBtn.disabled = false;
      this.translateBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="24" height="24">
          <path d="M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0014.07 6H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"/>
        </svg>
        Translate
      `;
    }
  }

  swapLanguages() {
    const tempLang = this.sourceLanguageSelect.value;
    const tempText = this.sourceText.value;
    
    this.sourceLanguageSelect.value = this.targetLanguageSelect.value;
    this.sourceText.value = this.translatedText.value;
    
    this.targetLanguageSelect.value = tempLang;
    this.translatedText.value = tempText;
  }

  setupVoiceControls() {
    this.voiceSpeedControl.addEventListener('input', (e) => {
      document.getElementById('speedValue').textContent = e.target.value + 'x';
    });

    this.voicePitchControl.addEventListener('input', (e) => {
      document.getElementById('pitchValue').textContent = e.target.value + 'x';
    });
  }

  setupCopyAndClear() {
    this.copyBtn.addEventListener('click', () => {
      if (this.translatedText.value) {
        navigator.clipboard.writeText(this.translatedText.value)
          .then(() => {
            this.showToast('Text copied to clipboard!');
            this.copyBtn.classList.add('copied');
            setTimeout(() => this.copyBtn.classList.remove('copied'), 1500);
          })
          .catch(err => {
            console.error('Failed to copy text:', err);
            this.showToast('Failed to copy text');
          });
      }
    });

    this.clearBtn.addEventListener('click', () => {
      this.sourceText.value = '';
      this.translatedText.value = '';
      this.showToast('Text cleared');
    });
  }

  showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.add('show');
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
      }, 2000);
    }, 100);
  }

  showPermissionRequest() {
    this.permissionRequest.style.display = 'block';
    this.grantPermissionBtn.addEventListener('click', () => this.requestMediaPermission());
  }

  hidePermissionRequest() {
    this.permissionRequest.style.display = 'none';
  }

  async requestMediaPermission() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      this.hasMediaPermission = true;
      this.hidePermissionRequest();
      this.initializeSpeechRecognition();
    } catch (error) {
      console.error('Permission denied:', error);
      this.handlePermissionDenied();
    }
  }

  handlePermissionDenied() {
    this.hasMediaPermission = false;
    const deniedMessage = document.createElement('div');
    deniedMessage.className = 'permission-denied';
    deniedMessage.textContent = 'Microphone access denied. Please enable it in your browser settings.';
    this.permissionRequest.appendChild(deniedMessage);
  }

  updateRecordButtonState() {
    const micIcon = this.recordBtn.querySelector('svg');
    if (this.isRecording) {
      this.recordBtn.classList.add('recording');
      micIcon.style.fill = '#ff4444';
    } else {
      this.recordBtn.classList.remove('recording');
      micIcon.style.fill = 'white';
    }
  }

  resetSpeakButton() {
    this.speakBtn.classList.remove('recording');
    this.speakBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="24" height="24">
        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.8-1-3.3-2.5-4v8c1.5-.7 2.5-2.2 2.5-4zM14 3.2v2.1c2.9.9 5 3.5 5 6.7s-2.1 5.8-5 6.7v2.1c4-.9 7-4.5 7-8.8s-3-7.9-7-8.8z"/>
      </svg>
      Speak
    `;
  }

}

// Initialize the translator
const translator = new Translator();