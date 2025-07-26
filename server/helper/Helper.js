
const sendAllData = require("../controllers/sendAllData");
const timerController = require("../controllers/timerController");
const myCache = require('./myCache')
const parityModel = require('../models/parityModel')

// Function to initialize countPeriods from last period in database
const initializeCountPeriods = async () => {
    try {
        console.log('🔍 Initializing countPeriods from database...');
        const lastPeriod = await parityModel.findOne().sort({ createdAt: -1 });
        if (lastPeriod) {
            const currentPeriod = lastPeriod.parity + 1;
            myCache.set('countPeriods', currentPeriod);
            console.log('✅ countPeriods initialized to:', currentPeriod, 'from last period:', lastPeriod.parity);
        } else {
            myCache.set('countPeriods', 1);
            console.log('✅ No previous periods found, countPeriods initialized to: 1');
        }
    } catch (error) {
        console.log('❌ Error initializing countPeriods:', error);
        myCache.set('countPeriods', 1);
    }
};

const performAction = async (io) => {
    console.log('🔄 performAction called with io:', !!io);
    console.log('⏰ Action performed every 2 minutes');
    try {
        await timerController(io)  // io parameter pass करें
        console.log('✅ timerController completed');
    } catch (error) {
        console.log('❌ timerController error:', error);
    }
    sendAllData(io)
};

let minutes = 1;
let seconds = 0;

// Function to start the countdown
const startCountdown = async (io) => {
    console.log('🚀 startCountdown called with io:', !!io);
    
    // Initialize countPeriods from database
    await initializeCountPeriods();
    
    const countdownInterval = setInterval(() => {
        if (seconds === 0) {
            seconds = 59;
            if (minutes > 0) {
                minutes--;
            } else {
                // Perform action every 2 minutes
                console.log('⏰ Countdown finished, calling performAction');
                performAction(io);
                minutes = 1; // Reset minutes to 2 for the next cycle
            }
        } else {
            seconds--;
        }

        // Emit countdown data to the frontend
        io.emit('countdown', { minutes, seconds });
        let countperiod = myCache.get('countPeriods')
        io.emit('countPeriods', countperiod)
    }, 1000);
};

module.exports = { startCountdown, performAction };
