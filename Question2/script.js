document.addEventListener('DOMContentLoaded', () => {
    const WINDOW_SIZE = 10;
    const THIRD_PARTY_API_BASE_URL = "http://20.244.56.144/evaluation-service";
    const API_TIMEOUT_MS = 500;

    const API_PATHS = {
        'p': '/primes',
        'f': '/fibo',
        'e': '/even',
        'r': '/rand'
    };

    let numberWindow = [];

    const windowSizeDisplay = document.getElementById('windowSizeDisplay');
    const primeButton = document.getElementById('fetchPrime');
    const fibonacciButton = document.getElementById('fetchFibonacci');
    const evenButton = document.getElementById('fetchEven');
    const randomButton = document.getElementById('fetchRandom');

    const fetchedNumbersEl = document.getElementById('fetchedNumbers');
    const windowPrevStateEl = document.getElementById('windowPrevState');
    const windowCurrStateEl = document.getElementById('windowCurrState');
    const avgEl = document.getElementById('avg');
    const statusEl = document.getElementById('status');

    function updateStatus(message, isError = false) {
        statusEl.textContent = message;
        statusEl.style.color = isError ? '#d93025' : '#334';
        statusEl.style.borderColor = isError ? '#d93025' : '#1a73e8';
    }

    function updateDisplay(fetched, prev, curr, average) {
        fetchedNumbersEl.textContent = JSON.stringify(fetched, null, 2);
        windowPrevStateEl.textContent = JSON.stringify(prev, null, 2);
        windowCurrStateEl.textContent = JSON.stringify(curr, null, 2);
        avgEl.textContent = average;
    }

    async function fetchWithTimeout(resource, options = {}) {
        const { timeout = API_TIMEOUT_MS } = options;
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(resource, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(id);
            return response;
        } catch (error) {
            clearTimeout(id);
            throw error;
        }
    }

    async function fetchNumbersFromServerAPI(numberIdChar) {
        if (!API_PATHS[numberIdChar]) {
            updateStatus(`Invalid number ID character: ${numberIdChar}`, true);
            return [];
        }
        const apiUrl = `${THIRD_PARTY_API_BASE_URL}${API_PATHS[numberIdChar]}`;
        updateStatus(`Workspaceing numbers for ID '${numberIdChar}' from ${apiUrl}...`);

        try {
            const response = await fetchWithTimeout(apiUrl, { timeout: API_TIMEOUT_MS });

            if (!response.ok) {
                updateStatus(`Error: Failed to fetch numbers from ${apiUrl}. Server responded with ${response.status}.`, true);
                return [];
            }
            const data = await response.json();
            if (data && Array.isArray(data.numbers)) {
                const numericData = data.numbers.filter(n => typeof n === 'number');
                updateStatus(`Successfully fetched ${numericData.length} numbers.`);
                return numericData;
            } else {
                updateStatus(`Warning: Received unexpected data format from ${apiUrl}.`, true);
                return [];
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                updateStatus(`Error: Request to fetch numbers from ${apiUrl} timed out after ${API_TIMEOUT_MS}ms.`, true);
            } else {
                updateStatus(`Error fetching from ${apiUrl}: ${error.message}. Check console and CORS policy.`, true);
                console.error(`Workspace error for ${apiUrl}:`, error);
            }
            return [];
        }
    }

    async function processRequest(numberId) {
        if (!API_PATHS[numberId]) {
            updateStatus("Invalid number ID selected.", true);
            updateDisplay([], [...numberWindow], [...numberWindow], calculateAverage(numberWindow));
            return;
        }

        const windowPrevState = [...numberWindow];

        const fetchedNumbers = await fetchNumbersFromServerAPI(numberId);

        if (fetchedNumbers && fetchedNumbers.length > 0) {
            fetchedNumbers.forEach(num => {
                if (!numberWindow.includes(num)) {
                    if (numberWindow.length >= WINDOW_SIZE) {
                        numberWindow.shift();
                    }
                    numberWindow.push(num);
                }
            });
        }

        const windowCurrState = [...numberWindow];
        const avg = calculateAverage(windowCurrState);

        updateDisplay(fetchedNumbers || [], windowPrevState, windowCurrState, avg);
    }

    function calculateAverage(arr) {
        if (!arr || arr.length === 0) {
            return "0.00";
        }
        const sum = arr.reduce((acc, val) => acc + val, 0);
        return (sum / arr.length).toFixed(2);
    }

    if (windowSizeDisplay) {
        windowSizeDisplay.textContent = WINDOW_SIZE;
    }

    const buttons = [primeButton, fibonacciButton, evenButton, randomButton];
    buttons.forEach(button => {
        if (button) {
            button.addEventListener('click', (e) => {
                const idChar = e.target.dataset.idchar;
                if (idChar) {
                    processRequest(idChar);
                }
            });
        }
    });

    updateDisplay([], [], [], "0.00");
    updateStatus("Ready. Select a number type to fetch.");
});