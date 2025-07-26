const parityModel = require('../models/parityModel')
const BetModel = require('../models/UserBetModel');
const UserModel = require('../models/UserModel');
var countPeriod = 1; // Reset to 1 for fresh start
const myCache = require('../helper/myCache')
myCache.set('countPeriods', countPeriod)

// --- ENHANCED PAYOUT RATIOS ---
const PAYOUTS = {
    red: 2,
    green: 2,
    violet: 4.5,
    // Number betting (अगर आप add करना चाहते हैं)
    '0': 9,
    '1': 9, '2': 9, '3': 9, '4': 9, '5': 9, '6': 9, '7': 9, '8': 9, '9': 9
};

/**
 * Calculate dynamic payout based on bet amount and user history
 */
const calculatePayout = (color, betAmount, userId) => {
    let basePayout = PAYOUTS[color] || 2;
    
    // Dynamic payout based on bet amount (higher bet = slightly higher payout)
    if (betAmount >= 1000) {
        basePayout += 0.1; // 10% bonus for high bets
    } else if (betAmount >= 500) {
        basePayout += 0.05; // 5% bonus for medium bets
    }
    
    return basePayout;
};

/**
 * Main timer controller: declares result, updates bets, updates wallets
 */
const timerController = async (io = null) => {
    try {
        console.log('🕐 TimerController started...');
        
        let data = await parityModel.findOne().sort({ createdAt: -1 });
        if (data) {
            countPeriod = data.parity + 1;
            console.log('📊 Last period was:', data.parity, 'New period:', countPeriod);
        } else {
            countPeriod = 1;
            console.log('📊 No previous data, starting with period:', countPeriod);
        }
        myCache.set('countPeriods', countPeriod)
        
        console.log('📊 Declaring result for period:', countPeriod);
        const result = await declareResult();
        console.log('🎯 Result declared:', result.color);
        
        const parityData = new parityModel({
            parity: countPeriod, result: result.color, price: result.totalBetAmount
        })
        await parityData.save();
        console.log('💾 Parity data saved');

        // --- ENHANCED RESULT & WALLET UPDATE LOGIC ---
        // 0. पुराने periods के pending bets को उनके result के हिसाब से won/lost करो
        const oldPeriods = await parityModel.find({ parity: { $lt: countPeriod } });
        for (const periodObj of oldPeriods) {
            const periodNum = periodObj.parity;
            const periodResult = periodObj.result;
            const pendingBets = await BetModel.find({ period: periodNum, status: 'pending' });
            for (const bet of pendingBets) {
                if (bet.color === periodResult) {
                    bet.status = 'won';
                    // payout calculation
                    const payoutRatio = calculatePayout(periodResult, bet.betAmount, bet.userId);
                    const payout = bet.betAmount * payoutRatio;
                    const user = await UserModel.findById(bet.userId);
                    if (user) {
                        user.wallet += payout;
                        await user.save();
                    }
                } else {
                    bet.status = 'lost';
                }
                await bet.save();
            }
        }
        console.log('🕑 All old pending bets updated as per their period results up to period', countPeriod - 1);
        // 1. सभी bets निकालो जो इसी period के हैं
        const bets = await BetModel.find({ period: countPeriod });
        console.log('🎲 Found', bets.length, 'bets for period', countPeriod);
        
        if (bets.length === 0) {
            console.log('⚠️ No bets found for period', countPeriod);
            return;
        }
        
        const winnerIds = [];
        
        for (const bet of bets) {
            console.log('🔍 Processing bet:', bet.color, 'vs result:', result.color, 'User:', bet.userId);
            if (bet.color === result.color) {
                bet.status = 'won';
                // Dynamic payout calculation
                const payoutRatio = calculatePayout(result.color, bet.betAmount, bet.userId);
                const payout = bet.betAmount * payoutRatio;
                winnerIds.push({ userId: bet.userId, payout: payout, ratio: payoutRatio });
                console.log('✅ Winner! User:', bet.userId, 'Payout:', payout, 'Ratio:', payoutRatio);
            } else {
                bet.status = 'lost';
                console.log('❌ Lost! User:', bet.userId, 'Color:', bet.color);
            }
            await bet.save();
            console.log('💾 Bet status updated to:', bet.status);
        }
        
        // 2. Bulk payout (atomic) with enhanced logging
        console.log('💰 Processing payouts for', winnerIds.length, 'winners');
        for (const winner of winnerIds) {
            const user = await UserModel.findById(winner.userId);
            if (user) {
                const oldBalance = user.wallet;
                user.wallet += winner.payout;
                await user.save();
                console.log(`💵 Winner: ${winner.userId}, Old Balance: ${oldBalance}, New Balance: ${user.wallet}, Payout: ${winner.payout}, Ratio: ${winner.ratio}x`);
            } else {
                console.log('❌ User not found:', winner.userId);
            }
        }
        
        // 3. Real-time notification with enhanced data
        if (io) {
            console.log('📡 Sending real-time notifications');
            for (const bet of bets) {
                const isWinner = bet.color === result.color;
                const payoutRatio = isWinner ? calculatePayout(result.color, bet.betAmount, bet.userId) : 0;
                
                io.to(bet.userId?.toString()).emit('betResult', {
                    period: countPeriod,
                    status: bet.status,
                    color: bet.color,
                    result: result.color,
                    betAmount: bet.betAmount,
                    payout: isWinner ? bet.betAmount * payoutRatio : 0,
                    payoutRatio: payoutRatio
                });
            }
        }
        console.log('✅ TimerController completed successfully');
        // --- END ---

    } catch (error) {
        console.log('❌ TimerController Error:', error)
    }
}

/**
 * Declares the result color for the current period (fair & random)
 */
const declareResult = async () => {
    try {
        let period = countPeriod;
        const betAmountResult = await BetModel.find({ period });
        let totalRedBetAmount = 0;
        let totalGreenBetAmount = 0;
        let totalVioletBetAmount = 0;
        betAmountResult.forEach((cur) => {
            if (cur.color === 'red') totalRedBetAmount += cur.betAmount;
            else if (cur.color === 'green') totalGreenBetAmount += cur.betAmount;
            else if (cur.color === 'violet') totalVioletBetAmount += cur.betAmount;
        });
        const totalBetAmount = betAmountResult.reduce((acc, cur) => acc + cur.betAmount, 0);
        
        // --- FAIR RANDOM COLOR LOGIC ---
        let resultColor;
        const colors = ['red', 'green', 'violet'];
        const randomValue = Math.random();
        if (randomValue < 0.333) resultColor = 'red';
        else if (randomValue < 0.666) resultColor = 'green';
        else resultColor = 'violet';
        
        // Anti-repetition logic
        const lastResults = await parityModel.find().sort({ createdAt: -1 }).limit(2);
        if (lastResults.length >= 2) {
            const lastColor = lastResults[0].result;
            const secondLastColor = lastResults[1].result;
            if (lastColor === secondLastColor && lastColor === resultColor) {
                const otherColors = colors.filter(color => color !== resultColor);
                resultColor = otherColors[Math.floor(Math.random() * otherColors.length)];
            }
        }
        // --- END ---
        
        return {
            color: resultColor,
            totalBetAmount
        }
    } catch (error) {
        console.log('Error:', error);
    }
};

module.exports = timerController;